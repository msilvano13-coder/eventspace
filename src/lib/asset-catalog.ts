/**
 * Asset Catalog — unified runtime lookup for all placeable items.
 *
 * Replaces the split between FURNITURE_CATALOG (constants.ts) and
 * models-manifest.json. Fetches from Supabase asset_definitions table
 * with an in-memory cache, falling back to the builtin catalog if
 * the DB query fails.
 */

import { createClient } from "@/lib/supabase/client";
import type { AssetDefinition, FurnitureItemDef, SnapPoint } from "@/lib/types";
import { FURNITURE_CATALOG } from "@/lib/constants";

// ── Cache ──

let catalogCache: Map<string, AssetDefinition> | null = null;
let catalogPromise: Promise<Map<string, AssetDefinition>> | null = null;

/** Generate evenly-spaced snap points around a circle */
export function generateCircularSnapPoints(radius: number, count: number): SnapPoint[] {
  if (count <= 0) return [];
  const points: SnapPoint[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i - 90; // start from top
    const rad = (angle * Math.PI) / 180;
    points.push({
      x: Math.round(Math.cos(rad) * radius * 100) / 100,
      y: Math.round(Math.sin(rad) * radius * 100) / 100,
      angle: angle + 180, // face inward
    });
  }
  return points;
}

/** Generate snap points along long sides of a rectangle */
export function generateRectSnapPoints(width: number, height: number, count: number): SnapPoint[] {
  if (count <= 0) return [];
  const points: SnapPoint[] = [];
  const halfW = width / 2;
  const halfH = height / 2;

  // Distribute seats along long sides (width > height assumed)
  const isWide = width >= height;

  const seatsPerSide = Math.floor(count / 2);
  const remainder = count % 2;

  for (let side = 0; side < 2; side++) {
    const seatCount = side === 0 ? seatsPerSide + remainder : seatsPerSide;
    for (let i = 0; i < seatCount; i++) {
      const t = (i + 0.5) / seatCount; // 0..1 along the side
      if (isWide) {
        const x = -halfW + t * width;
        const y = side === 0 ? -halfH - 10 : halfH + 10; // offset outside table
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

/** Convert a FurnitureItemDef (legacy) to AssetDefinition */
export function legacyToAssetDefinition(item: FurnitureItemDef): AssetDefinition {
  const snapPoints =
    item.shape === "circle" && item.defaultRadius && item.maxSeats
      ? generateCircularSnapPoints(item.defaultRadius + 16, item.maxSeats)
      : item.shape === "rect" && item.maxSeats
        ? generateRectSnapPoints(item.defaultWidth, item.defaultHeight, item.maxSeats)
        : [];

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: "",
    shape: item.shape,
    defaultWidth: item.defaultWidth,
    defaultHeight: item.defaultHeight,
    defaultRadius: item.defaultRadius,
    fillColor: item.fill,
    strokeColor: item.stroke,
    maxSeats: item.maxSeats ?? 0,
    minSeats: 0,
    seatSpacing: 24,
    snapPoints,
    modelFilePath: null,
    modelFileSize: null,
    modelComplexity: null,
    modelVariants: [],
    physicalWidthIn: item.defaultWidth,
    physicalDepthIn: item.defaultHeight,
    physicalHeightIn: item.category === "table" ? 30 : item.category === "seating" ? 18 : 36,
    metadata: {},
    source: "builtin",
    active: true,
  };
}

/** Build the fallback catalog from the legacy FURNITURE_CATALOG constant */
function buildFallbackCatalog(): Map<string, AssetDefinition> {
  const map = new Map<string, AssetDefinition>();
  for (const item of FURNITURE_CATALOG) {
    map.set(item.id, legacyToAssetDefinition(item));
  }
  return map;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assetFromRow(r: any): AssetDefinition {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    subcategory: r.subcategory || "",
    shape: r.shape,
    defaultWidth: Number(r.default_width),
    defaultHeight: Number(r.default_height),
    defaultRadius: r.default_radius != null ? Number(r.default_radius) : undefined,
    fillColor: r.fill_color,
    strokeColor: r.stroke_color,
    maxSeats: r.max_seats ?? 0,
    minSeats: r.min_seats ?? 0,
    seatSpacing: Number(r.seat_spacing) || 24,
    snapPoints: Array.isArray(r.snap_points) ? r.snap_points : [],
    modelFilePath: r.model_file_path ?? null,
    modelFileSize: r.model_file_size != null ? Number(r.model_file_size) : null,
    modelComplexity: r.model_complexity ?? null,
    modelVariants: Array.isArray(r.model_variants) ? r.model_variants : [],
    physicalWidthIn: r.physical_width_in != null ? Number(r.physical_width_in) : null,
    physicalDepthIn: r.physical_depth_in != null ? Number(r.physical_depth_in) : null,
    physicalHeightIn: r.physical_height_in != null ? Number(r.physical_height_in) : null,
    metadata: r.metadata ?? {},
    source: r.source ?? "builtin",
    active: r.active ?? true,
  };
}

/** Fetch the full asset catalog from Supabase, with fallback to builtin */
export async function getAssetCatalog(): Promise<Map<string, AssetDefinition>> {
  if (catalogCache) return catalogCache;
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("asset_definitions")
        .select("*")
        .eq("active", true)
        .order("category")
        .order("name");

      if (error || !data || data.length === 0) {
        console.warn("[AssetCatalog] Supabase fetch failed or empty, using fallback", error?.message);
        catalogCache = buildFallbackCatalog();
        return catalogCache;
      }

      const map = new Map<string, AssetDefinition>();
      for (const row of data) {
        map.set(row.id, assetFromRow(row));
      }
      catalogCache = map;
      return map;
    } catch (err) {
      console.warn("[AssetCatalog] Error fetching catalog, using fallback", err);
      catalogCache = buildFallbackCatalog();
      return catalogCache;
    }
  })();

  return catalogPromise;
}

/** Get a single asset by ID (from cache or fallback) */
export async function getAssetById(id: string): Promise<AssetDefinition | null> {
  const catalog = await getAssetCatalog();
  return catalog.get(id) ?? null;
}

/** Synchronous lookup — only works after getAssetCatalog() has resolved */
export function getAssetByIdSync(id: string): AssetDefinition | null {
  if (!catalogCache) return null;
  return catalogCache.get(id) ?? null;
}

/** Get the cached catalog synchronously (returns null if not yet loaded) */
export function getCatalogSync(): Map<string, AssetDefinition> | null {
  return catalogCache;
}

/** Invalidate the cache (e.g., after admin adds new assets) */
export function invalidateAssetCache(): void {
  catalogCache = null;
  catalogPromise = null;
}

/** Convert AssetDefinition back to legacy FurnitureItemDef for backward compat */
export function toLegacyFurnitureItemDef(asset: AssetDefinition): FurnitureItemDef {
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category as FurnitureItemDef["category"],
    shape: asset.shape,
    defaultWidth: asset.defaultWidth,
    defaultHeight: asset.defaultHeight,
    defaultRadius: asset.defaultRadius,
    fill: asset.fillColor,
    stroke: asset.strokeColor,
    maxSeats: asset.maxSeats || undefined,
  };
}
