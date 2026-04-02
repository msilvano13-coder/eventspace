#!/usr/bin/env node
/**
 * build-manifest.js
 *
 * Reads asset-library-groups.json, scans generated-models/ for .glb files,
 * matches them up, cleans scraped fields, and writes models-manifest.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GROUPS_FILE = path.join(ROOT, 'asset-library-groups.json');
const MODELS_DIR = path.join(ROOT, 'generated-models');
const OUTPUT_FILE = path.join(ROOT, 'models-manifest.json');

// ---------------------------------------------------------------------------
// Field cleanup
// ---------------------------------------------------------------------------

// Noise tokens that indicate the start of garbage in comma-separated scraped text.
const NOISE_STARTS = [
  'SIZE', 'SHAPE', 'FABRIC DESIGN',
  'Pairs with', 'Pairs Well With', 'Partner with',
  'CHAIRS', 'TABLES', 'FURNITURE', 'BARS & BACK BARS', 'COCKTAIL TABLES',
  'BARS', 'BACK BARS', 'LIGHTING', 'ROOM DIVIDERS', 'STAGES', 'FLOORING',
  'CHARGER', 'CHINA', 'DISHWARE', 'FLATWARE', 'GLASSWARE', 'LINENS',
  'SERVING PIECES', 'CATERING',
  'VIEW LOCATION', 'LIVE CHAT', 'SEND US AN EMAIL',
  'Expert Help', 'Full Cycle', 'Delivery',
  'Join Our', 'Schedule an', 'Our Family',
  'Event Rentals', 'All Products', 'Tent Rentals',
  'Privacy Policy', 'Terms of Use',
  '(833)', 'Email Address', 'SUBMIT', 'Close', 'Submit',
];

function cleanField(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Split on commas and take tokens until we hit a noise token
  const parts = trimmed.split(',').map(s => s.trim());
  const cleaned = [];

  for (const part of parts) {
    // Check if this part starts with any noise token
    const isNoise = NOISE_STARTS.some(n => part.startsWith(n));
    if (isNoise) break;
    if (part) cleaned.push(part);
  }

  return cleaned.join(', ');
}

// ---------------------------------------------------------------------------
// Scan GLB files on disk
// ---------------------------------------------------------------------------

function scanGlbFiles() {
  const glbMap = {}; // slug -> { relativePath, fileSize }

  const catalogs = fs.readdirSync(MODELS_DIR).filter(f => {
    const full = path.join(MODELS_DIR, f);
    return fs.statSync(full).isDirectory() && f !== '.DS_Store';
  });

  for (const catalog of catalogs) {
    const catalogDir = path.join(MODELS_DIR, catalog);
    const categories = fs.readdirSync(catalogDir).filter(f => {
      const full = path.join(catalogDir, f);
      return fs.statSync(full).isDirectory() && f !== '.DS_Store';
    });

    for (const category of categories) {
      const categoryDir = path.join(catalogDir, category);
      const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.glb'));

      for (const file of files) {
        const slug = file.replace('.glb', '');
        const fullPath = path.join(categoryDir, file);
        const stat = fs.statSync(fullPath);
        const relativePath = path.join(catalog, category, file);

        glbMap[slug] = {
          relativePath,
          fileSize: stat.size,
          catalog,
          category,
        };
      }
    }
  }

  return glbMap;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // 1. Read groups
  const groupsData = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf-8'));
  const groups = groupsData.groups;

  // 2. Build a map from slug -> group entry
  const groupMap = {};
  for (const group of groups) {
    const slug = group.baseModelName.toLowerCase().replace(/[\/\s]+/g, '-');
    groupMap[slug] = group;
  }

  // 3. Scan disk
  const glbMap = scanGlbFiles();

  // 4. Match and build manifest
  const models = {};
  const categories = {};

  const unmatchedGlbs = [];
  const unmatchedGroups = [];

  // Process each GLB found on disk
  for (const [slug, glbInfo] of Object.entries(glbMap)) {
    const group = groupMap[slug];

    if (!group) {
      unmatchedGlbs.push({ slug, path: glbInfo.relativePath });
      continue;
    }

    // Clean variants
    const variants = (group.variants || []).map(v => ({
      name: v.name || '',
      color: cleanField(v.color),
      material: cleanField(v.material),
      productFolder: v.productFolder || '',
    }));

    models[slug] = {
      id: slug,
      name: group.baseModelName,
      category: group.category,
      catalog: group.catalog,
      complexity: group.modelComplexity || 'medium',
      filePath: glbInfo.relativePath,
      fileSize: glbInfo.fileSize,
      variants,
    };

    // Accumulate category stats
    if (!categories[group.category]) {
      categories[group.category] = { count: 0, catalog: group.catalog };
    }
    categories[group.category].count++;
  }

  // Check for groups that have no GLB on disk
  for (const [slug, group] of Object.entries(groupMap)) {
    if (!glbMap[slug]) {
      unmatchedGroups.push({ slug, name: group.baseModelName, category: group.category });
    }
  }

  // 5. Build output
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalModels: Object.keys(models).length,
    models,
    categories,
  };

  // 6. Write
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  // 7. Summary
  console.log('=== Build Manifest Summary ===');
  console.log(`Total GLB files on disk:    ${Object.keys(glbMap).length}`);
  console.log(`Total groups in JSON:       ${groups.length}`);
  console.log(`Matched models:             ${manifest.totalModels}`);
  console.log(`Categories:                 ${Object.keys(categories).length}`);
  console.log(`Output written to:          ${OUTPUT_FILE}`);
  console.log();

  // Category breakdown
  console.log('--- Categories ---');
  for (const [cat, info] of Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${cat}: ${info.count} models (${info.catalog})`);
  }

  if (unmatchedGlbs.length > 0) {
    console.log();
    console.log(`--- GLBs on disk with no matching group (${unmatchedGlbs.length}) ---`);
    for (const item of unmatchedGlbs) {
      console.log(`  ${item.slug}  ->  ${item.path}`);
    }
  }

  if (unmatchedGroups.length > 0) {
    console.log();
    console.log(`--- Groups with no GLB on disk (${unmatchedGroups.length}) ---`);
    for (const item of unmatchedGroups) {
      console.log(`  ${item.slug}  (${item.name}, ${item.category})`);
    }
  }
}

main();
