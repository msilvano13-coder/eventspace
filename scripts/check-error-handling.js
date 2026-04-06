#!/usr/bin/env node
/**
 * Protocol 9: Error Handling Lint Rule
 *
 * Scans src/ for catch blocks that use console.error without a
 * corresponding showErrorToast call. Flags violations so silent
 * failures don't creep back into the codebase.
 *
 * Exclusions:
 *  - API routes (src/app/api/) — server-side logging is fine there
 *  - Comments and strings are not excluded (simple grep-level check)
 *
 * Run: node scripts/check-error-handling.js
 * Exit code 0 = clean, 1 = violations found.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

// Directories where console.error is acceptable without showErrorToast
const EXCLUDED_DIRS = ["src/app/api"];

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      results.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function isExcluded(filePath) {
  const rel = path.relative(ROOT, filePath);
  return EXCLUDED_DIRS.some((d) => rel.startsWith(d));
}

/**
 * Check each catch block region: if it has console.error but no
 * showErrorToast nearby, flag it.
 */
function checkFile(filePath) {
  const src = fs.readFileSync(filePath, "utf-8");
  const lines = src.split("\n");
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    if (/console\.error/.test(lines[i])) {
      // Look within a 5-line window for showErrorToast or devThrow
      const windowStart = Math.max(0, i - 5);
      const windowEnd = Math.min(lines.length - 1, i + 5);
      const window = lines.slice(windowStart, windowEnd + 1).join("\n");

      if (!/showErrorToast/.test(window) && !/devThrow/.test(window)) {
        violations.push({
          line: i + 1,
          text: lines[i].trim(),
        });
      }
    }
  }

  return violations;
}

console.log("Protocol 9: Error Handling Lint");
console.log("───────────────────────────────");

const files = walk(SRC);
let totalViolations = 0;

for (const file of files) {
  if (isExcluded(file)) continue;

  const violations = checkFile(file);
  if (violations.length > 0) {
    const rel = path.relative(ROOT, file);
    for (const v of violations) {
      console.error(`  ${rel}:${v.line}  console.error without showErrorToast`);
      console.error(`    ${v.text}`);
    }
    totalViolations += violations.length;
  }
}

// Baseline: known existing violations as of 2026-04-03.
// Decrease this number as you fix them. Never increase it.
const BASELINE = 66;

if (totalViolations > BASELINE) {
  console.error(`\nFAILED: ${totalViolations} violations (baseline: ${BASELINE}). New console.error calls added without showErrorToast.`);
  console.error("  Use showErrorToast() for user-visible errors, or move to src/app/api/ if server-only.\n");
  process.exit(1);
} else if (totalViolations > 0) {
  console.log(`\nPASSED (with ${totalViolations} existing violations, baseline: ${BASELINE}).`);
  console.log("  No new violations. Reduce existing ones over time.\n");
} else {
  console.log("PASSED: All client-side error handling uses showErrorToast.\n");
}
