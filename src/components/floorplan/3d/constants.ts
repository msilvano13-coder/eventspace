import { Color } from "three";
import { VenuePreset } from "../VenueEnvironment";

// ── Scale constants ──

/** Scale factor: convert canvas px (inches) to 3D world units */
export const SCALE = 1 / 12; // 1 inch = 1/12 world unit (1 foot = 1 unit; a 60" table = 5 units)
export const S = SCALE; // alias for compact geometry args

/** Visual height multiplier — exaggerate furniture height so it reads at overview scale */
export const H_MULT = 1.8;

/** Room wall height in world units */
export const WALL_HEIGHT = 8 * S * 12; // 8 feet

/** Conversion: meters -> floorplan units = 1 / 0.3048 ~ 3.2808 (meters to feet) */
export const METERS_TO_FLOORPLAN = 1 / 0.3048;

// ── Types ──

export type CameraPreset = "default" | "birds-eye" | "eye-level" | "presentation" | "walkthrough";

export interface View3DSettings {
  venuePreset: VenuePreset;
  chairStyle: "solid-back" | "chiavari" | "folding" | "ghost";
  linenColor: "ivory" | "white" | "blush" | "navy" | "sage" | "gold";
  floorMaterial: "hardwood" | "marble" | "carpet" | "concrete" | "tile";
  floorColor: string | null; // null = use default for material type
  lightingMood: "warm" | "cool" | "neutral" | "dramatic";
  lightingColorCast: number; // 0 = neutral white, 1 = full mood color
  chairColor: string | null; // null = use default gold/wood tones
  linenCustomColor: string | null; // null = use preset linen color
  wallColor: string | null; // null = use default warm neutrals
  matchSeatToLinen: boolean; // true = seat cushion uses linen color, false = uses chair color
  showLabels: boolean;
  showShadows: boolean;
  cameraPreset: CameraPreset;
  qualityOverride: "auto" | "low" | "medium" | "high";
}

export interface ParsedObject {
  type: "furniture" | "room";
  furnitureId: string;
  label: string;
  shape: "circle" | "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  angle: number;
  fill: string;
  stroke: string;
  points?: number[][];
  inTableSet?: boolean;
  tableSetFurnitureId?: string;
  tableCenter?: { x: number; y: number };
  tablescapeId?: string;
  tableId?: string;
}

/** PBR material properties per furniture category */
export interface PBRProps {
  roughness: number;
  metalness: number;
  envMapIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

// ── Settings defaults ──

export const DEFAULT_SETTINGS: View3DSettings = {
  venuePreset: "none",
  chairStyle: "solid-back",
  linenColor: "ivory",
  floorMaterial: "hardwood",
  floorColor: null,
  lightingMood: "neutral",
  lightingColorCast: 1.0,
  chairColor: null,
  linenCustomColor: null,
  wallColor: null,
  matchSeatToLinen: false,
  showLabels: true,
  showShadows: true,
  cameraPreset: "default",
  qualityOverride: "auto",
};

// ── Material / color lookup tables ──

export const LINEN_COLORS: Record<View3DSettings["linenColor"], string> = {
  ivory: "#f5f0e6",
  white: "#ffffff",
  blush: "#f0d4d4",
  navy: "#2c3e6b",
  sage: "#b2c4a8",
  gold: "#d4b96a",
};

export const FLOOR_MATERIALS: Record<View3DSettings["floorMaterial"], { color: string; roughness: number; metalness: number; envMapIntensity: number }> = {
  hardwood: { color: "#c4a06e", roughness: 0.55, metalness: 0.02, envMapIntensity: 0.4 },
  marble: { color: "#ede6d8", roughness: 0.08, metalness: 0.08, envMapIntensity: 0.8 },
  carpet: { color: "#9a8b7a", roughness: 0.98, metalness: 0.0, envMapIntensity: 0.01 },
  concrete: { color: "#b0b0b0", roughness: 0.82, metalness: 0.01, envMapIntensity: 0.08 },
  tile: { color: "#f2ede5", roughness: 0.25, metalness: 0.04, envMapIntensity: 0.5 },
};

export const LIGHTING_MOODS: Record<View3DSettings["lightingMood"], {
  ambientIntensity: number;
  ambientColor: string;
  keyColor: string;
  keyIntensity: number;
  fillColor: string;
  fillIntensity: number;
}> = {
  warm: { ambientIntensity: 0.5, ambientColor: "#fdf8f0", keyColor: "#fff5e6", keyIntensity: 1.0, fillColor: "#e0e8f0", fillIntensity: 0.2 },
  cool: { ambientIntensity: 0.5, ambientColor: "#f0f4f8", keyColor: "#e8f0ff", keyIntensity: 0.9, fillColor: "#f0e8e0", fillIntensity: 0.25 },
  neutral: { ambientIntensity: 0.6, ambientColor: "#f5f5f5", keyColor: "#ffffff", keyIntensity: 0.8, fillColor: "#f0f0f0", fillIntensity: 0.3 },
  dramatic: { ambientIntensity: 0.15, ambientColor: "#f5e8d8", keyColor: "#ffe0b0", keyIntensity: 1.4, fillColor: "#d0d8e8", fillIntensity: 0.1 },
};

// ── Furniture heights (in inches) ──

/** Heights in 3D (in inches, matching the 1px = 1 inch scale) */
export const FURNITURE_HEIGHTS: Record<string, number> = {
  "round-table-60": 30,
  "round-table-72": 30,
  "rect-table-6": 30,
  "rect-table-8": 30,
  "cocktail-table": 42,
  "sweetheart-table": 30,
  "high-top-table": 42,
  "gift-table": 30,
  "cake-table": 30,
  "guest-book-table": 30,
  "chair": 34,
  "sofa": 32,
  "dance-floor": 1,
  "stage": 18,
  "dj-booth": 36,
  "bar": 42,
  "buffet": 34,
  "photo-booth": 80,
  "restrooms": 96,
  "dessert-station": 34,
  "coffee-station": 34,
  "flower-arrangement": 18,
  "arch": 96,
  "aisle-runner": 0.5,
  "uplighting": 6,
  "draping": 108,
};

export function getHeight(furnitureId: string): number {
  return (FURNITURE_HEIGHTS[furnitureId] ?? 30) * H_MULT;
}

// ── PBR material lookup ──

export const FURNITURE_PBR: Record<string, PBRProps> = {
  // Wood tables — warm, slightly rough, subtle sheen
  "round-table-60": { roughness: 0.7, metalness: 0.0, envMapIntensity: 0.4 },
  "round-table-72": { roughness: 0.7, metalness: 0.0, envMapIntensity: 0.4 },
  "rect-table-6": { roughness: 0.7, metalness: 0.0, envMapIntensity: 0.4 },
  "rect-table-8": { roughness: 0.7, metalness: 0.0, envMapIntensity: 0.4 },
  "sweetheart-table": { roughness: 0.6, metalness: 0.0, envMapIntensity: 0.5 },
  "gift-table": { roughness: 0.7, metalness: 0.0, envMapIntensity: 0.4 },
  "cake-table": { roughness: 0.6, metalness: 0.0, envMapIntensity: 0.5 },
  "guest-book-table": { roughness: 0.7, metalness: 0.0, envMapIntensity: 0.4 },
  // High-gloss surfaces — polished bar-top look with clearcoat
  "cocktail-table": { roughness: 0.3, metalness: 0.1, envMapIntensity: 0.8, clearcoat: 0.3, clearcoatRoughness: 0.1 },
  "high-top-table": { roughness: 0.3, metalness: 0.1, envMapIntensity: 0.8, clearcoat: 0.3, clearcoatRoughness: 0.1 },
  // Seating — fabric/upholstery, almost no reflections
  "chair": { roughness: 0.85, metalness: 0.0, envMapIntensity: 0.08 },
  "sofa": { roughness: 0.9, metalness: 0.0, envMapIntensity: 0.05 },
  // Metal/service items — polished countertops
  "bar": { roughness: 0.4, metalness: 0.3, envMapIntensity: 0.9, clearcoat: 0.4, clearcoatRoughness: 0.15 },
  "buffet": { roughness: 0.5, metalness: 0.1, envMapIntensity: 0.5 },
  "dj-booth": { roughness: 0.5, metalness: 0.2, envMapIntensity: 0.6 },
  // Flat surfaces — dance floor is glossy and reflective
  "dance-floor": { roughness: 0.2, metalness: 0.05, envMapIntensity: 1.2, clearcoat: 0.5, clearcoatRoughness: 0.05 },
  "stage": { roughness: 0.6, metalness: 0.0, envMapIntensity: 0.3 },
  "aisle-runner": { roughness: 0.95, metalness: 0.0, envMapIntensity: 0.02 },
  // Structures
  "photo-booth": { roughness: 0.5, metalness: 0.1, envMapIntensity: 0.4 },
  "arch": { roughness: 0.6, metalness: 0.0, envMapIntensity: 0.3 },
  "draping": { roughness: 0.95, metalness: 0.0, envMapIntensity: 0.02 },
  // Service stations
  "dessert-station": { roughness: 0.5, metalness: 0.1, envMapIntensity: 0.5 },
  "coffee-station": { roughness: 0.4, metalness: 0.2, envMapIntensity: 0.6 },
  // Decor
  "flower-arrangement": { roughness: 0.9, metalness: 0.0, envMapIntensity: 0.1 },
  "uplighting": { roughness: 0.3, metalness: 0.5, envMapIntensity: 0.8 },
};

export const DEFAULT_PBR: PBRProps = { roughness: 0.6, metalness: 0.0, envMapIntensity: 0.3 };

export function getPBR(furnitureId: string): PBRProps {
  return FURNITURE_PBR[furnitureId] ?? DEFAULT_PBR;
}

// ── Furniture categories ──

/** Classify a furnitureId into a rendering category */
export type FurnitureCategory =
  | "round-table"
  | "rect-table"
  | "cocktail-table"
  | "chair"
  | "sofa"
  | "service-counter"
  | "flat-surface"
  | "stage"
  | "dj-booth"
  | "photo-booth"
  | "arch"
  | "flower-arrangement"
  | "draping"
  | "uplighting"
  | "default";

export function getFurnitureCategory(furnitureId: string): FurnitureCategory {
  // Round tables
  if (furnitureId.startsWith("round-table")) return "round-table";
  // Cocktail / high-top tables (tall pedestal)
  if (furnitureId === "cocktail-table" || furnitureId === "high-top-table") return "cocktail-table";
  // Rectangular tables
  if (
    furnitureId.startsWith("rect-table") ||
    furnitureId === "sweetheart-table" ||
    furnitureId === "gift-table" ||
    furnitureId === "cake-table" ||
    furnitureId === "guest-book-table"
  )
    return "rect-table";
  // Chairs
  if (furnitureId === "chair") return "chair";
  // Sofas
  if (furnitureId === "sofa") return "sofa";
  // Service counters (bar, buffet, dessert, coffee)
  if (
    furnitureId === "bar" ||
    furnitureId === "buffet" ||
    furnitureId === "dessert-station" ||
    furnitureId === "coffee-station"
  )
    return "service-counter";
  // Flat surfaces
  if (furnitureId === "dance-floor" || furnitureId === "aisle-runner") return "flat-surface";
  // Stage
  if (furnitureId === "stage") return "stage";
  // DJ booth
  if (furnitureId === "dj-booth") return "dj-booth";
  // Photo booth
  if (furnitureId === "photo-booth") return "photo-booth";
  // Arch
  if (furnitureId === "arch") return "arch";
  // Flower arrangement
  if (furnitureId === "flower-arrangement") return "flower-arrangement";
  // Draping
  if (furnitureId === "draping") return "draping";
  // Uplighting
  if (furnitureId === "uplighting") return "uplighting";
  return "default";
}

// ── Color cache ──

/** Avoid allocating THREE.Color on every render, bounded to prevent leaks */
export const MAX_COLOR_CACHE = 200;
export const colorCache = new Map<string, Color>();

export function getCachedColor(hex: string): Color {
  let c = colorCache.get(hex);
  if (!c) {
    // Evict oldest entries if cache is full
    if (colorCache.size >= MAX_COLOR_CACHE) {
      const firstKey = colorCache.keys().next().value;
      if (firstKey !== undefined) colorCache.delete(firstKey);
    }
    try {
      c = new Color(hex);
    } catch {
      console.warn(`[3D] Invalid color "${hex}", using fallback grey`);
      c = new Color("#cccccc");
    }
    colorCache.set(hex, c);
  }
  return c;
}

/** Blend a mood color toward neutral white. cast=0 -> pure white, cast=1 -> original color */
export function blendToNeutral(hex: string, cast: number): string {
  const c = new Color(hex);
  const white = new Color("#ffffff");
  c.lerp(white, 1 - cast);
  return "#" + c.getHexString();
}

/** Darken or lighten a hex color by a factor (-1 to 1) */
export function adjustBrightness(hex: string, factor: number): string {
  const c = new Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.l = Math.max(0, Math.min(1, hsl.l + factor));
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return "#" + c.getHexString();
}

// ── Lighting constants ──

/** Max shadow-casting point lights to protect GPU */
export const MAX_SHADOW_LIGHTS = 4;

/** Downward-pointing types that get cone beams */
export const DOWNLIGHT_TYPES = new Set(["spotlight", "pinspot", "gobo"]);

/** Ground-level uplight types that wash walls */
export const UPLIGHT_TYPES = new Set(["uplight", "wash"]);

// ── Tablescape constants ──

export const TABLESCAPE_CATEGORY_SIZE: Record<string, number> = {
  "charger-set-plates": 0.33,
  "china-dishware": 0.27,
  "flatware": 0.22,
  "glassware": 0.08,
  "linens": 0.45,
  "serving-pieces": 0.30,
};
