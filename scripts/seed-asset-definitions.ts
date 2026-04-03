/**
 * Seed script: Populate asset_definitions table from
 * FURNITURE_CATALOG (builtin 2D items) + models-manifest.json (3D models).
 *
 * Usage: npx tsx scripts/seed-asset-definitions.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually (no dotenv dependency)
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Builtin furniture (from constants.ts, inlined to avoid import issues) ──

interface BuiltinItem {
  id: string;
  name: string;
  category: string;
  shape: "circle" | "rect";
  defaultWidth: number;
  defaultHeight: number;
  defaultRadius?: number;
  fill: string;
  stroke: string;
  maxSeats?: number;
}

const FURNITURE_CATALOG: BuiltinItem[] = [
  { id: "round-table-60", name: 'Round Table (60")', category: "table", shape: "circle", defaultWidth: 60, defaultHeight: 60, defaultRadius: 30, fill: "#f5f0e8", stroke: "#c4b5a0", maxSeats: 8 },
  { id: "round-table-72", name: 'Round Table (72")', category: "table", shape: "circle", defaultWidth: 72, defaultHeight: 72, defaultRadius: 36, fill: "#f5f0e8", stroke: "#c4b5a0", maxSeats: 10 },
  { id: "rect-table-6", name: "Rectangular Table (6')", category: "table", shape: "rect", defaultWidth: 72, defaultHeight: 30, fill: "#f5f0e8", stroke: "#c4b5a0", maxSeats: 6 },
  { id: "rect-table-8", name: "Rectangular Table (8')", category: "table", shape: "rect", defaultWidth: 96, defaultHeight: 30, fill: "#f5f0e8", stroke: "#c4b5a0", maxSeats: 8 },
  { id: "cocktail-table", name: "Cocktail Table", category: "table", shape: "circle", defaultWidth: 24, defaultHeight: 24, defaultRadius: 12, fill: "#f5f0e8", stroke: "#c4b5a0", maxSeats: 4 },
  { id: "sweetheart-table", name: "Sweetheart Table", category: "table", shape: "rect", defaultWidth: 48, defaultHeight: 24, fill: "#fce7f3", stroke: "#ec4899", maxSeats: 2 },
  { id: "high-top-table", name: "High-Top Table", category: "table", shape: "circle", defaultWidth: 24, defaultHeight: 24, defaultRadius: 12, fill: "#f5f0e8", stroke: "#92400e", maxSeats: 4 },
  { id: "gift-table", name: "Gift Table", category: "table", shape: "rect", defaultWidth: 60, defaultHeight: 30, fill: "#f5f0e8", stroke: "#c4b5a0", maxSeats: 0 },
  { id: "cake-table", name: "Cake Table", category: "table", shape: "circle", defaultWidth: 36, defaultHeight: 36, defaultRadius: 18, fill: "#f5f0e8", stroke: "#c4b5a0", maxSeats: 0 },
  { id: "guest-book-table", name: "Guest Book Table", category: "table", shape: "rect", defaultWidth: 48, defaultHeight: 24, fill: "#f5f0e8", stroke: "#c4b5a0", maxSeats: 0 },
  { id: "chair", name: "Chair", category: "seating", shape: "rect", defaultWidth: 16, defaultHeight: 16, fill: "#dde5ed", stroke: "#94a3b8" },
  { id: "sofa", name: "Lounge Sofa", category: "seating", shape: "rect", defaultWidth: 72, defaultHeight: 30, fill: "#dde5ed", stroke: "#94a3b8" },
  { id: "dance-floor", name: "Dance Floor", category: "entertainment", shape: "rect", defaultWidth: 160, defaultHeight: 160, fill: "#fef3c7", stroke: "#d97706" },
  { id: "stage", name: "Stage", category: "entertainment", shape: "rect", defaultWidth: 180, defaultHeight: 80, fill: "#e0e7ff", stroke: "#6366f1" },
  { id: "dj-booth", name: "DJ Booth", category: "entertainment", shape: "rect", defaultWidth: 48, defaultHeight: 24, fill: "#e0e7ff", stroke: "#6366f1" },
  { id: "bar", name: "Bar", category: "structure", shape: "rect", defaultWidth: 96, defaultHeight: 36, fill: "#fce7f3", stroke: "#ec4899" },
  { id: "buffet", name: "Buffet Station", category: "structure", shape: "rect", defaultWidth: 96, defaultHeight: 30, fill: "#fce7f3", stroke: "#ec4899" },
  { id: "photo-booth", name: "Photo Booth", category: "structure", shape: "rect", defaultWidth: 60, defaultHeight: 60, fill: "#fef3c7", stroke: "#d97706" },
  { id: "restrooms", name: "Restrooms", category: "structure", shape: "rect", defaultWidth: 48, defaultHeight: 36, fill: "#e0e7ff", stroke: "#6366f1" },
  { id: "dessert-station", name: "Dessert Station", category: "structure", shape: "rect", defaultWidth: 72, defaultHeight: 30, fill: "#fce7f3", stroke: "#ec4899" },
  { id: "coffee-station", name: "Coffee Station", category: "structure", shape: "rect", defaultWidth: 60, defaultHeight: 24, fill: "#fef3c7", stroke: "#92400e" },
  { id: "flower-arrangement", name: "Flower Arrangement", category: "decor", shape: "circle", defaultWidth: 20, defaultHeight: 20, defaultRadius: 10, fill: "#fecdd3", stroke: "#e11d48" },
  { id: "arch", name: "Ceremony Arch", category: "decor", shape: "rect", defaultWidth: 60, defaultHeight: 10, fill: "#d1fae5", stroke: "#059669" },
  { id: "aisle-runner", name: "Aisle Runner", category: "decor", shape: "rect", defaultWidth: 30, defaultHeight: 200, fill: "#fff1f2", stroke: "#fda4af" },
  { id: "uplighting", name: "Uplighting", category: "decor", shape: "circle", defaultWidth: 12, defaultHeight: 12, defaultRadius: 6, fill: "#fef9c3", stroke: "#ca8a04" },
  { id: "draping", name: "Draping", category: "decor", shape: "rect", defaultWidth: 120, defaultHeight: 8, fill: "#f5f5f4", stroke: "#a8a29e" },
];

// ── Snap point generation ──

function generateCircularSnapPoints(radius: number, count: number) {
  if (count <= 0) return [];
  const points: { x: number; y: number; angle: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i - 90;
    const rad = (angle * Math.PI) / 180;
    points.push({
      x: Math.round(Math.cos(rad) * radius * 100) / 100,
      y: Math.round(Math.sin(rad) * radius * 100) / 100,
      angle: angle + 180,
    });
  }
  return points;
}

function generateRectSnapPoints(width: number, height: number, count: number) {
  if (count <= 0) return [];
  const points: { x: number; y: number; angle: number }[] = [];
  const halfW = width / 2;
  const halfH = height / 2;
  const isWide = width >= height;
  const seatsPerSide = Math.floor(count / 2);
  const remainder = count % 2;

  for (let side = 0; side < 2; side++) {
    const seatCount = side === 0 ? seatsPerSide + remainder : seatsPerSide;
    for (let i = 0; i < seatCount; i++) {
      const t = (i + 0.5) / seatCount;
      if (isWide) {
        const x = -halfW + t * width;
        const y = side === 0 ? -halfH - 10 : halfH + 10;
        points.push({ x: Math.round(x), y: Math.round(y), angle: side === 0 ? 180 : 0 });
      } else {
        const y = -halfH + t * height;
        const x = side === 0 ? -halfW - 10 : halfW + 10;
        points.push({ x: Math.round(x), y: Math.round(y), angle: side === 0 ? 90 : 270 });
      }
    }
  }
  return points;
}

// ── Main ──

async function main() {
  console.log("Seeding asset_definitions...\n");

  const rows: any[] = [];

  // 1. Builtin furniture
  for (const item of FURNITURE_CATALOG) {
    const snapPoints =
      item.shape === "circle" && item.defaultRadius && item.maxSeats
        ? generateCircularSnapPoints(item.defaultRadius + 16, item.maxSeats)
        : item.shape === "rect" && item.maxSeats
          ? generateRectSnapPoints(item.defaultWidth, item.defaultHeight, item.maxSeats)
          : [];

    rows.push({
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: "",
      shape: item.shape,
      default_width: item.defaultWidth,
      default_height: item.defaultHeight,
      default_radius: item.defaultRadius ?? null,
      fill_color: item.fill,
      stroke_color: item.stroke,
      max_seats: item.maxSeats ?? 0,
      min_seats: 0,
      seat_spacing: 24,
      snap_points: snapPoints,
      model_file_path: null,
      model_file_size: null,
      model_complexity: null,
      model_variants: [],
      physical_width_in: item.defaultWidth,
      physical_depth_in: item.defaultHeight,
      physical_height_in: item.category === "table" ? 30 : item.category === "seating" ? 18 : 36,
      metadata: {},
      source: "builtin",
      active: true,
    });
  }

  console.log(`  ${rows.length} builtin furniture items`);

  // 2. 3D models from manifest
  const manifestPath = path.resolve(__dirname, "../public/models-manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const models = manifest.models || {};
    let modelCount = 0;

    for (const [modelId, model] of Object.entries(models) as [string, any][]) {
      // Skip if a builtin already has this ID
      if (rows.some((r) => r.id === modelId)) {
        // Merge 3D model info into existing builtin row
        const existing = rows.find((r) => r.id === modelId);
        if (existing) {
          existing.model_file_path = model.filePath;
          existing.model_file_size = model.fileSize;
          existing.model_complexity = model.complexity || null;
          existing.model_variants = model.variants || [];
        }
        continue;
      }

      // Estimate reasonable 2D footprint from category
      const catSize: Record<string, { w: number; h: number }> = {
        "bars-back-bars": { w: 96, h: 36 },
        "ceremony": { w: 60, h: 60 },
        "chairs": { w: 16, h: 16 },
        "dance-floors": { w: 160, h: 160 },
        "lighting-decor": { w: 12, h: 12 },
        "lounge": { w: 72, h: 30 },
        "staging": { w: 96, h: 48 },
        "tables": { w: 60, h: 60 },
        "tents": { w: 240, h: 240 },
      };
      const size = catSize[model.category] || { w: 48, h: 48 };

      // Map manifest complexity to DB constraint values
      const complexityMap: Record<string, string> = { simple: "low", medium: "medium", complex: "high" };
      const mappedComplexity = complexityMap[model.complexity] || null;

      rows.push({
        id: modelId,
        name: model.name,
        category: model.category,
        subcategory: "",
        shape: "rect",
        default_width: size.w,
        default_height: size.h,
        default_radius: null,
        fill_color: "#f5f0e8",
        stroke_color: "#c4b5a0",
        max_seats: 0,
        min_seats: 0,
        seat_spacing: 24,
        snap_points: [],
        model_file_path: model.filePath,
        model_file_size: model.fileSize,
        model_complexity: mappedComplexity,
        model_variants: model.variants || [],
        physical_width_in: null,
        physical_depth_in: null,
        physical_height_in: null,
        metadata: {},
        source: "model_manifest",
        active: true,
      });
      modelCount++;
    }

    console.log(`  ${modelCount} 3D model assets (${Object.keys(models).length - modelCount} merged with builtins)`);
  } else {
    console.log("  (No models-manifest.json found, skipping 3D models)");
  }

  // 3. Upsert to Supabase
  console.log(`\nUpserting ${rows.length} asset definitions...`);

  // Batch in chunks of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("asset_definitions")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`  Error upserting batch ${i / BATCH_SIZE + 1}:`, error.message);
      process.exit(1);
    }
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)} done`);
  }

  console.log("\n✓ Asset definitions seeded successfully!");
}

main().catch(console.error);
