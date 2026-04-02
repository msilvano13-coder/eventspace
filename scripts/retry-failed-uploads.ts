import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  if (!process.env[key]) process.env[key] = val;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BUCKET = "models";
const MODELS_DIR = path.resolve(__dirname, "../public/models");

const FAILED = [
  "floorplan/furniture/white-shelter-seating.glb",
  "floorplan/furniture/white-shelter-side-chair.glb",
  "floorplan/lighting/marquee-lighting-f.glb",
  "floorplan/lighting/marquee-lighting-h.glb",
  "floorplan/lighting/marquee-lighting-i.glb",
  "floorplan/lighting/marquee-lighting-j.glb",
  "floorplan/room-dividers-stanchions/8-x5-bengaline-royal-blue-drape.glb",
  "floorplan/room-dividers-stanchions/8-x5-bengaline-valentine-red-drape.glb",
  "floorplan/room-dividers-stanchions/black-stanchion-post-w-retractable-6-5-belt.glb",
  "floorplan/stages-flooring/box-step.glb",
  "floorplan/stages-flooring/carpet-w-bound-edge.glb",
  "floorplan/stages-flooring/dance-floor-panel.glb",
  "tablescape/charger-set-plates/cheerful-rim-charger.glb",
  "tablescape/china-dishware/white-modern-coffee-creamer.glb",
  "tablescape/linens/20-x-20-cecil-white-napkin.glb",
  "tablescape/linens/20-x-20-cotton-white-napkin.glb",
  "tablescape/serving-pieces/resin-bar-tray.glb",
  "tablescape/serving-pieces/ribbed-white-round-bowl.glb",
];

async function main() {
  for (const rel of FAILED) {
    const filePath = path.join(MODELS_DIR, rel);
    const buf = fs.readFileSync(filePath);
    const sizeMB = (buf.length / 1024 / 1024).toFixed(1);

    const { error } = await supabase.storage.from(BUCKET).upload(rel, buf, {
      contentType: "model/gltf-binary",
      upsert: true,
      cacheControl: "public, max-age=31536000, immutable",
    });

    if (error) {
      console.error(`  FAIL ${rel} (${sizeMB}MB): ${error.message}`);
    } else {
      console.log(`  OK   ${rel} (${sizeMB}MB)`);
    }
  }
}

main().catch(console.error);
