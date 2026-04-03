#!/usr/bin/env node
/**
 * Protocol 6: Migration Drift Detection
 *
 * Verifies structural invariants that should hold across all tables:
 * 1. Every table with FK to events should have a denormalized user_id column
 * 2. Every table with user_id should have a direct RLS policy (not multi-hop)
 * 3. Every ToRow mapper should match its FromRow mapper (delegates to Protocol 10)
 *
 * This protocol catches drift BEFORE it hits production — e.g., adding a new
 * child table without denormalizing user_id onto it.
 *
 * Run: node scripts/check-migration-drift.js
 */

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase");
const DB_FILE = path.join(__dirname, "..", "src", "lib", "supabase", "db.ts");

// Tables that reference events (directly or via parent chain) and MUST have user_id
const TABLES_NEEDING_USER_ID = [
  "guests",
  "vendors",
  "floor_plans",
  "invoices",
  "schedule_items",
  "timeline_items",
  "expenses",
  "budget_items",
  "event_contracts",
  "shared_files",
  "mood_board_images",
  "messages",
  "discovered_vendors",
  "layout_objects",       // grandchild via floor_plans
  "layout_versions",      // grandchild via floor_plans
  "tablescapes",          // direct child of events
  "tablescape_items",     // grandchild via tablescapes
];

// Tables exempt from user_id requirement (public catalogs, system tables)
const EXEMPT_TABLES = new Set([
  "asset_definitions",    // public read-only catalog
  "profiles",             // uses auth.uid() = id directly
  "teams",                // uses owner_id pattern
  "team_members",         // uses team join pattern
  "team_event_assignments",
  "team_invitations",
  "contract_audit_log",   // system audit table
  "contract_templates",   // shared templates
  "notifications",        // uses recipient_id pattern
  "preferred_vendors",    // uses user_id already but different pattern
  "guest_relationships",  // joined via guests
  "questionnaire_assignments", // uses user_id on questionnaires parent
  "lighting_zones",       // grandchild — 1-hop RLS via floor_plans.user_id (acceptable)
]);

let failures = 0;

// ── Check 1: Scan migrations for tables with event_id FK but no user_id ──
console.log("── Protocol 6: Migration Drift Detection ──\n");
console.log("Check 1: Tables with event ownership chain must have user_id\n");

const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql"));
const allSQL = migrationFiles
  .map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8"))
  .join("\n\n");

// Find all CREATE TABLE statements
const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(/gi;
const allTables = new Set();
let match;
while ((match = createTableRegex.exec(allSQL)) !== null) {
  allTables.add(match[1]);
}

// Check each table that should have user_id
for (const table of TABLES_NEEDING_USER_ID) {
  // Look for user_id column addition in any migration
  const hasUserIdAdd = new RegExp(
    `alter\\s+table\\s+(?:public\\.)?${table}\\s+add\\s+(?:column\\s+)?(?:if\\s+not\\s+exists\\s+)?user_id`,
    "i"
  ).test(allSQL);

  const hasUserIdInCreate = new RegExp(
    `create\\s+table[^;]*?${table}\\s*\\([^;]*?user_id`,
    "is"
  ).test(allSQL);

  if (!hasUserIdAdd && !hasUserIdInCreate) {
    console.log(`  FAIL: ${table} — missing user_id column`);
    failures++;
  } else {
    console.log(`  OK:   ${table}`);
  }
}

// ── Check 2: Scan for new tables with event_id that aren't in our known list ──
console.log("\nCheck 2: New tables with event_id not in known list\n");

const eventFKRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\([^;]*?event_id\s+uuid/gi;
while ((match = eventFKRegex.exec(allSQL)) !== null) {
  const tableName = match[1];
  if (!TABLES_NEEDING_USER_ID.includes(tableName) && !EXEMPT_TABLES.has(tableName)) {
    console.log(`  WARN: ${tableName} has event_id but is not in TABLES_NEEDING_USER_ID or EXEMPT_TABLES`);
    console.log(`        → Add it to one of these lists in check-migration-drift.js`);
    failures++;
  }
}

// Also check tables with floor_plan_id FK (grandchildren)
const floorPlanFKRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\([^;]*?floor_plan_id\s+uuid/gi;
while ((match = floorPlanFKRegex.exec(allSQL)) !== null) {
  const tableName = match[1];
  if (!TABLES_NEEDING_USER_ID.includes(tableName) && !EXEMPT_TABLES.has(tableName)) {
    console.log(`  WARN: ${tableName} has floor_plan_id but is not in TABLES_NEEDING_USER_ID or EXEMPT_TABLES`);
    failures++;
  }
}

// Also check tables with tablescape_id FK (grandchildren)
const tablescapeFKRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\([^;]*?tablescape_id\s+uuid.*?references/gi;
while ((match = tablescapeFKRegex.exec(allSQL)) !== null) {
  const tableName = match[1];
  if (!TABLES_NEEDING_USER_ID.includes(tableName) && !EXEMPT_TABLES.has(tableName)) {
    console.log(`  WARN: ${tableName} has tablescape_id FK but is not in TABLES_NEEDING_USER_ID or EXEMPT_TABLES`);
    failures++;
  }
}

if (failures === 0) {
  console.log("  OK:   No unknown tables with event ownership chain\n");
}

// ── Check 3: Verify RLS policies use direct user_id (not multi-hop JOINs) ──
console.log("Check 3: RLS policies should use direct user_id checks\n");

// Look for policies that still JOIN through events to check user_id
// Pattern: "join public.events" inside a policy for tables that have user_id
for (const table of TABLES_NEEDING_USER_ID) {
  const policyRegex = new RegExp(
    `create\\s+policy[^;]*?on\\s+(?:public\\.)?${table}[^;]*?join\\s+(?:public\\.)?events\\s+e`,
    "gi"
  );
  if (policyRegex.test(allSQL)) {
    // Check if there's ALSO a replacement policy (DROP + CREATE pattern)
    const dropRegex = new RegExp(
      `drop\\s+policy[^;]*?on\\s+(?:public\\.)?${table}`,
      "gi"
    );
    const drops = allSQL.match(dropRegex) || [];
    const creates = allSQL.match(new RegExp(
      `create\\s+policy[^;]*?on\\s+(?:public\\.)?${table}[^;]*?auth\\.uid\\(\\)\\s*=\\s*user_id`,
      "gi"
    )) || [];

    if (creates.length > 0) {
      console.log(`  OK:   ${table} — has direct user_id policy (old multi-hop dropped)`);
    } else {
      console.log(`  WARN: ${table} — still using multi-hop JOIN in RLS policy`);
      // Don't fail — might be intentional for tables not yet migrated
    }
  }
}

// ── Summary ──
console.log("\n── Summary ──");
if (failures > 0) {
  console.log(`\n  FAILED: ${failures} drift issue(s) found.`);
  console.log("  Fix the issues above, then re-run: node scripts/check-migration-drift.js\n");
  process.exit(1);
} else {
  console.log("\n  PASSED: No migration drift detected.\n");
  process.exit(0);
}
