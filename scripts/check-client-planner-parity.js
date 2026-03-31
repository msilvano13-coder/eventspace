#!/usr/bin/env node
/**
 * Protocol 8: Client/Planner Parity Audit
 *
 * Compares the sub-entities the planner store can replace vs what the
 * client store (useClientActions) can update. Flags any that exist on
 * one side but not the other.
 *
 * Run: node scripts/check-client-planner-parity.js
 * Exit code 0 = parity, 1 = mismatches found.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// ── Extract planner-side replacer keys from store.ts ──

function extractRecordKeys(filePath, varName) {
  const src = fs.readFileSync(filePath, "utf-8");
  const startRe = new RegExp(`const ${varName}.*?=\\s*\\{`, "s");
  const startMatch = src.match(startRe);
  if (!startMatch) return null;

  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  while (i < src.length && depth > 0) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") depth--;
    i++;
  }
  const body = src.slice(startMatch.index + startMatch[0].length, i - 1);

  const keys = [];
  const keyRe = /^\s{2}(\w+)\s*:/gm;
  let m;
  while ((m = keyRe.exec(body)) !== null) keys.push(m[1]);
  return keys.sort();
}

// ── Extract client-side update keys from useClientStore.ts ──

function extractClientUpdateKeys(filePath) {
  const src = fs.readFileSync(filePath, "utf-8");
  const keys = [];
  const re = /partial\.(\w+)\s*!==\s*undefined/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[1] !== "colorPalette") keys.push(m[1]);
  }
  return keys.sort();
}

// ── Extract clientUpdate* function names from db.ts ──

function extractClientUpdateFunctions(filePath) {
  const src = fs.readFileSync(filePath, "utf-8");
  const keys = [];
  const re = /export async function clientUpdate(\w+)\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    // Convert function suffix to camelCase sub-entity key
    const name = m[1];
    // clientUpdateGuests -> guests, clientUpdateMoodBoard -> moodBoard, clientUpdateEventFields -> skip
    if (name === "EventFields") continue; // generic field updater, not a sub-entity
    const key = name.charAt(0).toLowerCase() + name.slice(1);
    keys.push(key);
  }
  return keys.sort();
}

const storePath = path.join(ROOT, "src/lib/store.ts");
const clientStorePath = path.join(ROOT, "src/hooks/useClientStore.ts");
const dbPath = path.join(ROOT, "src/lib/supabase/db.ts");

const plannerKeys = extractRecordKeys(storePath, "SUB_ENTITY_REPLACERS");
const clientHookKeys = extractClientUpdateKeys(clientStorePath);
const clientDbKeys = extractClientUpdateFunctions(dbPath);

let failed = false;

console.log("Protocol 8: Client/Planner Parity Audit");
console.log("────────────────────────────────────────");

if (!plannerKeys) { console.error("  Could not parse planner keys"); process.exit(1); }
if (!clientHookKeys) { console.error("  Could not parse client hook keys"); process.exit(1); }
if (!clientDbKeys) { console.error("  Could not parse client db keys"); process.exit(1); }

// ── Check 1: useClientActions hook vs db.ts clientUpdate* functions ──
// These two must be in sync — if the hook references a sub-entity,
// the db function must exist (and vice versa).
// Note: "questionnaires" in hook maps to "questionnaireAssignments" in db
const CLIENT_KEY_ALIASES = { questionnaires: "questionnaireAssignments" };

console.log("\n1. useClientActions hook vs db.ts clientUpdate* functions:");
const hookNormalized = clientHookKeys.map((k) => CLIENT_KEY_ALIASES[k] || k).sort();
const dbSet = new Set(clientDbKeys);
const hookSet = new Set(hookNormalized);

const inHookNotDb = hookNormalized.filter((k) => !dbSet.has(k));
const inDbNotHook = clientDbKeys.filter((k) => !hookSet.has(k));

if (inHookNotDb.length > 0) {
  console.error(`  Hook calls but no db function: ${inHookNotDb.join(", ")}`);
  failed = true;
}
if (inDbNotHook.length > 0) {
  console.error(`  db functions exist but hook doesn't call: ${inDbNotHook.join(", ")}`);
  failed = true;
}
if (!inHookNotDb.length && !inDbNotHook.length) {
  console.log("  PASSED");
}

// ── Check 2: Client keys that planner doesn't know about (real error) ──
console.log("\n2. Client has keys unknown to planner:");
const plannerSet = new Set(plannerKeys);
const unknownClient = clientHookKeys.filter((k) => !plannerSet.has(k));
if (unknownClient.length > 0) {
  console.error(`  Client handles unknown sub-entities: ${unknownClient.join(", ")}`);
  failed = true;
} else {
  console.log("  PASSED");
}

// ── Check 3: Planner-only keys (informational) ──
console.log("\n3. Planner-only sub-entities (not editable by client):");
const clientKeySet = new Set(clientHookKeys);
const plannerOnly = plannerKeys.filter((k) => !clientKeySet.has(k));
if (plannerOnly.length > 0) {
  console.log(`  (info) ${plannerOnly.join(", ")} — verify this is intentional`);
} else {
  console.log("  All planner sub-entities are also in client");
}

if (failed) {
  console.error("\nFAILED: Client/Planner sub-entity handling has issues.\n");
  process.exit(1);
} else {
  console.log("\nPASSED: Client and planner sub-entity handling is consistent.\n");
}
