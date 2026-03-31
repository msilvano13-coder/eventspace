#!/usr/bin/env node
/**
 * Protocol 7: Sub-Entity Registry Consistency Check
 *
 * Verifies that SUB_ENTITY_KEYS, SUB_ENTITY_FETCHERS, SUB_ENTITY_REPLACERS,
 * and useClientActions all reference the same set of sub-entity keys.
 *
 * Run: node scripts/check-sub-entity-registry.js
 * Exit code 0 = all consistent, 1 = mismatches found.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function extractSetEntries(filePath, pattern) {
  const src = fs.readFileSync(filePath, "utf-8");
  const match = src.match(pattern);
  if (!match) return null;
  // Extract all quoted strings from the matched block
  const keys = [];
  const re = /["']([a-zA-Z]+)["']/g;
  let m;
  while ((m = re.exec(match[0])) !== null) keys.push(m[1]);
  return keys.sort();
}

function extractRecordKeys(filePath, varName) {
  const src = fs.readFileSync(filePath, "utf-8");
  // Find the start of the object literal after "const VARNAME ... = {"
  const startRe = new RegExp(`const ${varName}.*?=\\s*\\{`, "s");
  const startMatch = src.match(startRe);
  if (!startMatch) return null;

  // Use brace counting to find the matching closing brace
  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  while (i < src.length && depth > 0) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") depth--;
    i++;
  }
  const body = src.slice(startMatch.index + startMatch[0].length, i - 1);

  // Extract top-level keys (lines starting with "  keyName:")
  const keys = [];
  const keyRe = /^\s{2}(\w+)\s*:/gm;
  let m;
  while ((m = keyRe.exec(body)) !== null) keys.push(m[1]);
  return keys.sort();
}

function extractClientUpdateKeys(filePath) {
  const src = fs.readFileSync(filePath, "utf-8");
  // Find all partial.XYZ checks in useClientActions
  const keys = [];
  const re = /partial\.(\w+)\s*!==\s*undefined/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    // colorPalette is an event field, not a sub-entity
    if (m[1] !== "colorPalette") keys.push(m[1]);
  }
  return keys.sort();
}

// ── Collect keys from each source ──

const storePath = path.join(ROOT, "src/lib/store.ts");
const clientStorePath = path.join(ROOT, "src/hooks/useClientStore.ts");

const keys = extractSetEntries(
  storePath,
  /SUB_ENTITY_KEYS\s*=\s*new\s+Set[^(]*\(\[([^\]]+)\]/s
);
const fetchers = extractRecordKeys(storePath, "SUB_ENTITY_FETCHERS");
const replacers = extractRecordKeys(storePath, "SUB_ENTITY_REPLACERS");
const clientKeys = extractClientUpdateKeys(clientStorePath);

// ── Compare ──

let failed = false;

function compare(nameA, listA, nameB, listB) {
  if (!listA) { console.error(`  Could not parse ${nameA}`); failed = true; return; }
  if (!listB) { console.error(`  Could not parse ${nameB}`); failed = true; return; }

  const setA = new Set(listA);
  const setB = new Set(listB);

  const inANotB = listA.filter((k) => !setB.has(k));
  const inBNotA = listB.filter((k) => !setA.has(k));

  if (inANotB.length > 0) {
    console.error(`  In ${nameA} but missing from ${nameB}: ${inANotB.join(", ")}`);
    failed = true;
  }
  if (inBNotA.length > 0) {
    console.error(`  In ${nameB} but missing from ${nameA}: ${inBNotA.join(", ")}`);
    failed = true;
  }
}

console.log("Protocol 7: Sub-Entity Registry Consistency Check");
console.log("──────────────────────────────────────────────────");

// floorPlans are fetched as part of the core load (fetchEventCore), not via a lazy fetcher
const CORE_FETCHED = new Set(["floorPlans"]);
const fetcherKeys = fetchers ? [...fetchers, ...CORE_FETCHED].sort() : null;

compare("SUB_ENTITY_KEYS", keys, "SUB_ENTITY_FETCHERS (+ core-fetched)", fetcherKeys);
compare("SUB_ENTITY_KEYS", keys, "SUB_ENTITY_REPLACERS", replacers);

// Client actions are intentionally a subset (clients can't edit all entities).
// Only fail if the client has keys the planner doesn't know about.
if (clientKeys) {
  const keySet = new Set(keys);
  const unknown = clientKeys.filter((k) => !keySet.has(k));
  if (unknown.length > 0) {
    console.error(`  useClientActions has unknown keys not in SUB_ENTITY_KEYS: ${unknown.join(", ")}`);
    failed = true;
  }
  const missing = keys.filter((k) => !new Set(clientKeys).has(k));
  if (missing.length > 0) {
    console.log(`  (info) Client portal does not handle: ${missing.join(", ")} — verify this is intentional`);
  }
} else {
  console.error("  Could not parse useClientActions");
  failed = true;
}

if (failed) {
  console.error("\nFAILED: Sub-entity registries are out of sync.\n");
  process.exit(1);
} else {
  console.log("PASSED: All registries are consistent.\n");
}
