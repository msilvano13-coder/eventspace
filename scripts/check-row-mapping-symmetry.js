#!/usr/bin/env node
/**
 * Protocol 10: Row Mapping Symmetry Check
 *
 * For every *ToRow function in db.ts, verifies a matching *FromRow exists
 * (and vice versa). Also checks that the DB column names used in each pair
 * are symmetric — a column written by ToRow should be read by FromRow.
 *
 * Run: node scripts/check-row-mapping-symmetry.js
 * Exit code 0 = symmetric, 1 = mismatches found.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "src/lib/supabase/db.ts");

const src = fs.readFileSync(DB_PATH, "utf-8");

// ── Step 1: Find all ToRow and FromRow function names ──

const toRowFns = new Set();
const fromRowFns = new Set();

const fnRe = /function\s+(\w+(?:ToRow|FromRow))\s*\(/g;
let m;
while ((m = fnRe.exec(src)) !== null) {
  const name = m[1];
  if (name.endsWith("ToRow")) {
    toRowFns.add(name);
  } else {
    fromRowFns.add(name);
  }
}

// ── Step 2: Check for unpaired functions ──

// Normalize: eventToRow <-> eventFromRow, eventCoreFromRow is a variant of eventFromRow
// Special cases we know about and skip
const KNOWN_UNPAIRED = new Set([
  "eventFieldsToRow",       // Partial updater, no FromRow equivalent
  "eventCoreFromRow",       // Variant of eventFromRow (core-only load)
  "clientEventFromRow",     // Client-specific mapper
  "auditEntryFromRow",      // Audit log, write-only via logContractAudit
  "safeProfileToRow",       // Variant of profileToRow
  "questionnaireFieldsToRow", // Partial updater
  "inquiryFieldsToRow",     // Partial updater
  "preferredVendorFieldsToRow", // Partial updater
  "contractTemplateFieldsToRow", // Partial updater
  "guestRelationshipToRow", // Managed by replaceGuestRelationships, separate flow
  "guestRelationshipFromRow",
]);

// Pairs where FromRow delegates to a helper (e.g. eventFromRow -> eventCoreFields)
// so the column extraction from the function body alone will miss columns.
// Skip column comparison for these but still check pairing.
const SKIP_COLUMN_CHECK = new Set(["event"]);

function getBaseName(fnName) {
  return fnName.replace(/ToRow$/, "").replace(/FromRow$/, "");
}

let failed = false;

console.log("Protocol 10: Row Mapping Symmetry Check");
console.log("────────────────────────────────────────");

// Check every ToRow has a matching FromRow
for (const toFn of toRowFns) {
  if (KNOWN_UNPAIRED.has(toFn)) continue;
  const base = getBaseName(toFn);
  const expectedFrom = base + "FromRow";
  if (!fromRowFns.has(expectedFrom)) {
    console.error(`  ${toFn} exists but ${expectedFrom} is missing`);
    failed = true;
  }
}

// Check every FromRow has a matching ToRow
for (const fromFn of fromRowFns) {
  if (KNOWN_UNPAIRED.has(fromFn)) continue;
  const base = getBaseName(fromFn);
  const expectedTo = base + "ToRow";
  if (!toRowFns.has(expectedTo)) {
    console.error(`  ${fromFn} exists but ${expectedTo} is missing`);
    failed = true;
  }
}

// ── Step 3: Compare DB column names in paired functions ──

function extractDbColumns(fnName) {
  // Find the function body (from "function name(" to the next "function " or end)
  const startRe = new RegExp(`function ${fnName}\\s*\\([^)]*\\)\\s*[:{]`);
  const startMatch = src.match(startRe);
  if (!startMatch) return null;

  const startIdx = startMatch.index + startMatch[0].length;

  // Find matching closing brace by counting depth
  let depth = 1;
  let i = startIdx;
  // Find the first { after the function signature
  while (i < src.length && src[i] !== "{") i++;
  i++; // skip the opening {
  depth = 1;
  while (i < src.length && depth > 0) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") depth--;
    i++;
  }
  const body = src.slice(startIdx, i);

  // Extract snake_case identifiers that look like DB columns
  // Pattern: r.column_name or row.column_name (FromRow) or key: value in return object (ToRow)
  const columns = new Set();
  const colRe = /(?:r|row)\.(\w+)|^\s*(\w+)\s*:/gm;
  let cm;
  while ((cm = colRe.exec(body)) !== null) {
    const col = cm[1] || cm[2];
    // Only include snake_case names (DB columns), skip camelCase (JS fields)
    if (col && col.includes("_")) {
      columns.add(col);
    }
  }
  return columns;
}

// For each paired ToRow/FromRow, compare their column sets
const checked = new Set();
for (const toFn of toRowFns) {
  if (KNOWN_UNPAIRED.has(toFn)) continue;
  const base = getBaseName(toFn);
  const fromFn = base + "FromRow";
  if (!fromRowFns.has(fromFn) || KNOWN_UNPAIRED.has(fromFn)) continue;

  if (SKIP_COLUMN_CHECK.has(base)) { checked.add(base); continue; }

  const toCols = extractDbColumns(toFn);
  const fromCols = extractDbColumns(fromFn);

  if (!toCols || !fromCols) continue;

  // Columns we expect to only appear in one direction
  const WRITE_ONLY = new Set(["user_id", "event_id", "planner_id", "floor_plan_id", "vendor_id", "invoice_id", "tablescape_id", "sort_order"]);
  // Read-only: auto-generated or joined child tables
  const READ_ONLY = new Set([
    "id", "created_at", "updated_at",
    // Joined child tables (FromRow reads these as nested arrays, ToRow doesn't write them)
    "floor_plans", "timeline_items", "schedule_items", "questionnaire_assignments",
    "budget_items", "event_contracts", "shared_files", "mood_board_images",
    "discovered_vendors", "lighting_zones", "layout_objects", "vendor_payments", "invoice_line_items",
    "tablescapes", "tablescape_items",
  ]);

  const inToNotFrom = Array.from(toCols).filter(
    (c) => !fromCols.has(c) && !WRITE_ONLY.has(c)
  );
  const inFromNotTo = Array.from(fromCols).filter(
    (c) => !toCols.has(c) && !READ_ONLY.has(c)
  );

  if (inToNotFrom.length > 0) {
    console.error(`  ${toFn} writes columns not read by ${fromFn}: ${inToNotFrom.join(", ")}`);
    failed = true;
  }
  if (inFromNotTo.length > 0) {
    console.error(`  ${fromFn} reads columns not written by ${toFn}: ${inFromNotTo.join(", ")}`);
    failed = true;
  }

  checked.add(base);
}

console.log(`  Checked ${checked.size} ToRow/FromRow pairs.`);

if (failed) {
  console.error("\nFAILED: Row mapping asymmetries found.\n");
  process.exit(1);
} else {
  console.log("PASSED: All row mappings are symmetric.\n");
}
