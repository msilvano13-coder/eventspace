/**
 * Upload all GLB + WebP model files from public/models/ to Supabase Storage.
 *
 * Usage:
 *   npx tsx scripts/upload-models.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (service role key bypasses RLS for bulk upload)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
// Load .env.local manually (no dotenv dependency needed)
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET = "models";
const MODELS_DIR = path.resolve(__dirname, "../public/models");

const MIME_TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};

function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllFiles(fullPath));
    } else if (stat.isFile()) {
      const ext = path.extname(name).toLowerCase();
      if (MIME_TYPES[ext]) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

async function main() {
  const files = getAllFiles(MODELS_DIR);
  console.log(`Found ${files.length} files to upload`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    const relativePath = path.relative(MODELS_DIR, filePath).replace(/\\/g, "/");
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const fileBuffer = fs.readFileSync(filePath);
    const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(relativePath, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: "public, max-age=31536000, immutable",
      });

    if (error) {
      console.error(`  FAIL ${relativePath} (${sizeMB}MB): ${error.message}`);
      failed++;
    } else {
      console.log(`  OK   ${relativePath} (${sizeMB}MB)`);
      uploaded++;
    }
  }

  console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);
