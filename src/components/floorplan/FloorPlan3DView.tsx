"use client";

import { useMemo, useCallback, useEffect, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Color, Vector2, Shape, DoubleSide, ACESFilmicToneMapping } from "three";
import { unwrapCanvasJSON } from "@/lib/floorplan-schema";
import { LightingZone } from "@/lib/types";
import { FURNITURE_CATALOG } from "@/lib/constants";
import { ErrorBoundary } from "./FloorPlan3DErrorBoundary";
import VenueEnvironment, { VenuePreset, VenuePresetDef, VENUE_PRESETS } from "./VenueEnvironment";

// ── 3D Settings ──

interface View3DSettings {
  venuePreset: VenuePreset;
  chairStyle: "solid-back" | "chiavari" | "folding" | "ghost";
  linenColor: "ivory" | "white" | "blush" | "navy" | "sage" | "gold";
  floorMaterial: "hardwood" | "marble" | "carpet" | "concrete";
  lightingMood: "warm" | "cool" | "neutral" | "dramatic";
  showLabels: boolean;
  showShadows: boolean;
}

const DEFAULT_SETTINGS: View3DSettings = {
  venuePreset: "none",
  chairStyle: "solid-back",
  linenColor: "ivory",
  floorMaterial: "hardwood",
  lightingMood: "warm",
  showLabels: true,
  showShadows: true,
};

const LINEN_COLORS: Record<View3DSettings["linenColor"], string> = {
  ivory: "#f5f0e6",
  white: "#ffffff",
  blush: "#f0d4d4",
  navy: "#2c3e6b",
  sage: "#b2c4a8",
  gold: "#d4b96a",
};

const FLOOR_MATERIALS: Record<View3DSettings["floorMaterial"], { color: string; roughness: number; metalness: number }> = {
  hardwood: { color: "#b8986a", roughness: 0.7, metalness: 0.03 },
  marble: { color: "#e8e0d0", roughness: 0.15, metalness: 0.12 },
  carpet: { color: "#8a7b6b", roughness: 0.95, metalness: 0.0 },
  concrete: { color: "#a0a0a0", roughness: 0.85, metalness: 0.02 },
};

const LIGHTING_MOODS: Record<View3DSettings["lightingMood"], {
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

// ── Parsing helpers ──

interface ParsedObject {
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
}

/** Heights in 3D (in inches, matching the 1px = 1 inch scale) */
const FURNITURE_HEIGHTS: Record<string, number> = {
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

function getHeight(furnitureId: string): number {
  return (FURNITURE_HEIGHTS[furnitureId] ?? 30) * H_MULT;
}

/** PBR material properties per furniture category */
interface PBRProps {
  roughness: number;
  metalness: number;
}

const FURNITURE_PBR: Record<string, PBRProps> = {
  // Wood tables — warm, slightly rough
  "round-table-60": { roughness: 0.7, metalness: 0.0 },
  "round-table-72": { roughness: 0.7, metalness: 0.0 },
  "rect-table-6": { roughness: 0.7, metalness: 0.0 },
  "rect-table-8": { roughness: 0.7, metalness: 0.0 },
  "sweetheart-table": { roughness: 0.6, metalness: 0.0 },
  "gift-table": { roughness: 0.7, metalness: 0.0 },
  "cake-table": { roughness: 0.6, metalness: 0.0 },
  "guest-book-table": { roughness: 0.7, metalness: 0.0 },
  // High-gloss surfaces
  "cocktail-table": { roughness: 0.3, metalness: 0.1 },
  "high-top-table": { roughness: 0.3, metalness: 0.1 },
  // Seating — fabric/upholstery
  "chair": { roughness: 0.85, metalness: 0.0 },
  "sofa": { roughness: 0.9, metalness: 0.0 },
  // Metal/service items
  "bar": { roughness: 0.4, metalness: 0.3 },
  "buffet": { roughness: 0.5, metalness: 0.1 },
  "dj-booth": { roughness: 0.5, metalness: 0.2 },
  // Flat surfaces
  "dance-floor": { roughness: 0.2, metalness: 0.05 },
  "stage": { roughness: 0.6, metalness: 0.0 },
  "aisle-runner": { roughness: 0.95, metalness: 0.0 },
  // Structures
  "photo-booth": { roughness: 0.5, metalness: 0.1 },
  "arch": { roughness: 0.6, metalness: 0.0 },
  "draping": { roughness: 0.95, metalness: 0.0 },
  // Service stations
  "dessert-station": { roughness: 0.5, metalness: 0.1 },
  "coffee-station": { roughness: 0.4, metalness: 0.2 },
  // Decor
  "flower-arrangement": { roughness: 0.9, metalness: 0.0 },
  "uplighting": { roughness: 0.3, metalness: 0.5 },
};

function getPBR(furnitureId: string): PBRProps {
  return FURNITURE_PBR[furnitureId] ?? { roughness: 0.6, metalness: 0.0 };
}

// ── Color cache (avoid allocating THREE.Color on every render, bounded to prevent leaks) ──
const MAX_COLOR_CACHE = 200;
const colorCache = new Map<string, Color>();
function getCachedColor(hex: string): Color {
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

/** Parse Fabric.js canvas JSON into 3D-renderable objects */
function parseCanvasJSON(floorPlanJSON: string | null): {
  objects: ParsedObject[];
  canvasWidth: number;
  canvasHeight: number;
} {
  if (!floorPlanJSON) return { objects: [], canvasWidth: 800, canvasHeight: 600 };

  const canvasJSON = unwrapCanvasJSON(floorPlanJSON);
  const fabricObjects = (canvasJSON as any).objects || [];
  const parsed: ParsedObject[] = [];

  /**
   * Recursively process Fabric.js objects into 3D-renderable ParsedObjects.
   *
   * Coordinate system notes (Fabric.js v6 with originX/Y: "center"):
   * - Group left/top = center position on canvas (or parent)
   * - Children left/top = relative to group center
   * - absX/absY accumulates through nesting: parent center + child offset * parent scale
   */
  function processObject(
    obj: any,
    parentX = 0,
    parentY = 0,
    parentAngle = 0,
    parentScaleX = 1,
    parentScaleY = 1,
    inTableSet = false,
  ) {
    const data = obj.data;
    // Apply parent scale to child positions within groups
    const absX = parentX + (obj.left || 0) * parentScaleX;
    const absY = parentY + (obj.top || 0) * parentScaleY;
    const absAngle = parentAngle + (obj.angle || 0);
    // Compound scale: parent scale * own scale
    const ownScaleX = (obj.scaleX || 1) * parentScaleX;
    const ownScaleY = (obj.scaleY || 1) * parentScaleY;

    // Table set groups or plain groups: recurse into children
    // Fabric.js v6 serializes type as "Group" (capital G)
    const objType = (obj.type || "").toLowerCase();
    if (objType === "group" && Array.isArray(obj.objects)) {
      // If this is a table set, recurse into sub-objects to render each piece
      if (data?.isTableSet) {
        for (const child of obj.objects) {
          processObject(child, absX, absY, absAngle, ownScaleX, ownScaleY, true);
        }
        return;
      }

      // Individual furniture item (group = shape + label) — has furnitureId
      if (data?.furnitureId) {
        const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
        const shape = catalogItem?.shape || "rect";
        // Prefer catalog dimensions over group bounding box (group bbox includes text label)
        const w = (catalogItem?.defaultWidth || obj.width || 40) * ownScaleX;
        const h = (catalogItem?.defaultHeight || obj.height || 40) * ownScaleY;
        const r = catalogItem?.defaultRadius ? catalogItem.defaultRadius * ownScaleX : undefined;

        parsed.push({
          type: "furniture",
          furnitureId: data.furnitureId,
          label: data.label || data.furnitureId,
          shape,
          x: absX,
          y: absY,
          width: w,
          height: h,
          radius: r,
          angle: absAngle,
          fill: catalogItem?.fill || obj.fill || "#f5f0e8",
          stroke: catalogItem?.stroke || obj.stroke || "#c4b5a0",
          inTableSet,
        });
        return;
      }

      // Unknown group without data — recurse to find nested items
      for (const child of obj.objects) {
        processObject(child, absX, absY, absAngle, ownScaleX, ownScaleY);
      }
      return;
    }

    // Bare shape (no data) inside a table set group — infer as chair or table from shape properties
    if (!data) {
      const shapeType = (obj.type || "").toLowerCase();
      if (shapeType === "circle" || shapeType === "rect" || shapeType === "rectangle") {
        const w = (obj.width || 20) * ownScaleX;
        const h = (obj.height || 20) * ownScaleY;
        const r = obj.radius ? obj.radius * ownScaleX : undefined;
        // Small items are likely chairs, larger items are tables
        const isSmallItem = w <= 20 && h <= 20;
        const inferredId = isSmallItem ? "chair" : (shapeType === "circle" ? "round-table-60" : "rect-table-6");
        parsed.push({
          type: "furniture",
          furnitureId: inferredId,
          label: "",
          shape: shapeType === "circle" ? "circle" : "rect",
          x: absX,
          y: absY,
          width: w,
          height: h,
          radius: r,
          angle: absAngle,
          fill: obj.fill || "#f5f0e8",
          stroke: obj.stroke || "#c4b5a0",
          inTableSet,
        });
      }
      return;
    }
    if (data.isGrid || data.isLighting || data.isLightingOverlay || data.isGuide) return;

    if (data.isRoom) {
      const points = obj.points || [];
      if (points.length < 3) return;

      // Fabric.js Polygon (originX:"left") stores left/top as the bounding-box edge.
      // pathOffset = center of the points bounding box (not serialized, recomputed here).
      const pxs = points.map((p: any) => p.x as number);
      const pys = points.map((p: any) => p.y as number);
      const pathOffsetX = (Math.min(...pxs) + Math.max(...pxs)) / 2;
      const pathOffsetY = (Math.min(...pys) + Math.max(...pys)) / 2;

      const objWidth = obj.width || 0;
      const objHeight = obj.height || 0;

      // Center of the polygon on canvas:
      //   centerX = left + (width * scaleX) / 2   (for originX:"left")
      const centerX = absX + (objWidth * ownScaleX) / 2;
      const centerY = absY + (objHeight * ownScaleY) / 2;

      // Convert every point to absolute canvas coordinates
      const absPoints = points.map((p: any) => [
        centerX + (p.x - pathOffsetX) * ownScaleX,
        centerY + (p.y - pathOffsetY) * ownScaleY,
      ]);

      parsed.push({
        type: "room",
        furnitureId: "",
        label: "Room",
        shape: "rect",
        // Store the TRUE center so centroid / camera calculations are correct
        x: centerX,
        y: centerY,
        width: objWidth * ownScaleX,
        height: objHeight * ownScaleY,
        angle: absAngle,
        fill: "#faf7f0",
        stroke: "#a89070",
        points: absPoints,
      });
      return;
    }

    if (data.furnitureId) {
      const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
      const shape = catalogItem?.shape || "rect";
      // Prefer catalog dimensions over raw object dimensions
      const w = (catalogItem?.defaultWidth || obj.width || 40) * ownScaleX;
      const h = (catalogItem?.defaultHeight || obj.height || 40) * ownScaleY;
      const r = catalogItem?.defaultRadius ? catalogItem.defaultRadius * ownScaleX : undefined;

      parsed.push({
        type: "furniture",
        furnitureId: data.furnitureId,
        label: data.label || data.furnitureId,
        shape,
        x: absX,
        y: absY,
        width: w,
        height: h,
        radius: r,
        angle: absAngle,
        fill: catalogItem?.fill || obj.fill || "#f5f0e8",
        stroke: catalogItem?.stroke || obj.stroke || "#c4b5a0",
      });
    }
  }

  for (const obj of fabricObjects) {
    processObject(obj);
  }

  return {
    objects: parsed,
    canvasWidth: (canvasJSON as any).width || 800,
    canvasHeight: (canvasJSON as any).height || 600,
  };
}

// ── 3D Components ──

/** Scale factor: convert canvas px (inches) to 3D world units */
const SCALE = 1 / 12; // 1 inch = 1/12 world unit (1 foot = 1 unit; a 60" table = 5 units)
const S = SCALE; // alias for compact geometry args

/** Visual height multiplier — exaggerate furniture height so it reads at overview scale */
const H_MULT = 1.8;

/** Room wall height in world units */
const WALL_HEIGHT = 8 * S * 12; // 8 feet

/** Classify a furnitureId into a rendering category */
type FurnitureCategory =
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

function getFurnitureCategory(furnitureId: string): FurnitureCategory {
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

/** Label that floats above every furniture piece */
// Text component from drei fetches a font from CDN which is blocked by CSP,
// causing Suspense to hang indefinitely. Labels disabled until a local font is bundled.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FurnitureLabel(_props: { label: string; y: number }) {
  return null;
}

function FurnitureMesh({ obj, originX, originY, settings }: { obj: ParsedObject; originX: number; originY: number; settings: View3DSettings }) {
  const h3d = getHeight(obj.furnitureId) * S;
  const pbr = getPBR(obj.furnitureId);

  // Convert 2D canvas position to 3D world position
  const posX = (obj.x - originX) * S;
  const posZ = (obj.y - originY) * S;
  // Table-set chairs have pre-set angles facing the table center — compensate
  // for the flipped back panel by adding π so they face inward again
  const category = getFurnitureCategory(obj.furnitureId);
  const chairTableSetOffset = (category === "chair" && obj.inTableSet) ? Math.PI : 0;
  const rotY = -(obj.angle * Math.PI) / 180 + chairTableSetOffset;

  const fillColor = getCachedColor(obj.fill);
  const strokeColor = getCachedColor(obj.stroke);
  const linenColor = getCachedColor(LINEN_COLORS[settings.linenColor]);
  const woodColor = getCachedColor("#8b7355");      // medium wood brown for table legs
  const chairGold = getCachedColor("#c4a46c");      // Chiavari gold for chair seats
  const chairBack = getCachedColor("#a8905a");      // darker gold for chair backs — adds depth
  const chairLeg = getCachedColor("#9a8050");        // chair leg tone
  const darkColor = getCachedColor("#3a3530");
  const carpetColor = getCachedColor("#4a3f35");
  const ledColor = getCachedColor("#00ccff");
  const flowerStemGreen = getCachedColor("#4a6b3a");
  const tileLight = getCachedColor("#e8e0d0");
  const tileDark = getCachedColor("#b8a888");
  const bannerRed = getCachedColor("#8b2020");

  const w = obj.width * S;
  const d = obj.height * S;

  // ── Round tables — with tablecloth drape ──
  if (category === "round-table") {
    const radius = (obj.radius || obj.width / 2) * S;
    const tableTopY = h3d;
    const topThick = 1.2 * S;
    const clothDrop = 12 * S; // tablecloth hangs 12 inches
    const clothRadius = radius + 1.5 * S; // cloth extends past table edge
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Pedestal base disc */}
        <mesh position={[0, 1 * S, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3 * S, 3.5 * S, 2 * S, 16]} />
          <meshStandardMaterial color={woodColor} roughness={0.4} metalness={0.15} />
        </mesh>
        {/* Pedestal column */}
        <mesh position={[0, tableTopY / 2, 0]} castShadow>
          <cylinderGeometry args={[1.2 * S, 1.5 * S, tableTopY - 2 * S, 8]} />
          <meshStandardMaterial color={woodColor} roughness={0.4} metalness={0.15} />
        </mesh>
        {/* Table surface */}
        <mesh position={[0, tableTopY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, topThick, 32]} />
          <meshStandardMaterial color={woodColor} roughness={0.55} metalness={0.05} />
        </mesh>
        {/* Tablecloth — slightly wider cylinder draped from top */}
        <mesh position={[0, tableTopY - clothDrop / 2, 0]} receiveShadow>
          <cylinderGeometry args={[clothRadius, clothRadius * 1.08, clothDrop, 32]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} />
        </mesh>
        {/* Tablecloth top disc */}
        <mesh position={[0, tableTopY + topThick / 2 + 0.01, 0]} receiveShadow>
          <cylinderGeometry args={[clothRadius, clothRadius, 0.05, 32]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} />
        </mesh>
        {/* Scalloped tablecloth edge — 8 gathered bumps around perimeter */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh key={`scallop-${i}`} position={[
              Math.cos(angle) * clothRadius * 0.95,
              tableTopY - clothDrop + 1.5 * S,
              Math.sin(angle) * clothRadius * 0.95,
            ]} receiveShadow>
              <cylinderGeometry args={[2.5 * S, 3 * S, 3 * S, 8]} />
              <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} />
            </mesh>
          );
        })}
        {/* Centerpiece vase */}
        <mesh position={[0, tableTopY + topThick / 2 + 2 * S, 0]} castShadow>
          <cylinderGeometry args={[0.8 * S, 1.2 * S, 4 * S, 8]} />
          <meshStandardMaterial color={strokeColor} roughness={0.3} metalness={0.15} />
        </mesh>
        {/* Centerpiece flowers */}
        <mesh position={[0, tableTopY + topThick / 2 + 5 * S, 0]} castShadow>
          <sphereGeometry args={[1.5 * S, 8, 8]} />
          <meshStandardMaterial color={fillColor} roughness={0.7} metalness={0} />
        </mesh>
        {settings.showLabels && <FurnitureLabel label={obj.label} y={tableTopY + topThick + 2 * S} />}
      </group>
    );
  }

  // ── Cocktail / high-top tables — tall stem, small top ──
  if (category === "cocktail-table") {
    const radius = (obj.radius || obj.width / 2) * S;
    const tableTopY = h3d;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Base disc — heavy foot */}
        <mesh position={[0, 0.8 * S, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3 * S, 3.5 * S, 1.6 * S, 16]} />
          <meshStandardMaterial color={woodColor} roughness={0.35} metalness={0.2} />
        </mesh>
        {/* Thin chrome pole */}
        <mesh position={[0, tableTopY / 2, 0]} castShadow>
          <cylinderGeometry args={[0.6 * S, 0.6 * S, tableTopY - 2 * S, 8]} />
          <meshStandardMaterial color={woodColor} roughness={0.2} metalness={0.4} />
        </mesh>
        {/* Table top — thin */}
        <mesh position={[0, tableTopY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, 1 * S, 32]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Optional small cloth/topper */}
        <mesh position={[0, tableTopY + 0.55 * S, 0]} receiveShadow>
          <cylinderGeometry args={[radius * 0.85, radius * 0.85, 0.1, 32]} />
          <meshStandardMaterial color={linenColor} roughness={0.9} metalness={0} />
        </mesh>
        {settings.showLabels && <FurnitureLabel label={obj.label} y={tableTopY + 2 * S} />}
      </group>
    );
  }

  // ── Rectangular tables — with linen overhang ──
  if (category === "rect-table") {
    const tableTopY = h3d;
    const topThick = 1.5 * S;
    const clothDrop = 10 * S;
    const clothOverhang = 2 * S;
    const legW = 1.2 * S;
    const legInset = 2.5 * S;
    const legPositions: [number, number, number][] = [
      [-w / 2 + legInset, (tableTopY - topThick) / 2, -d / 2 + legInset],
      [w / 2 - legInset, (tableTopY - topThick) / 2, -d / 2 + legInset],
      [-w / 2 + legInset, (tableTopY - topThick) / 2, d / 2 - legInset],
      [w / 2 - legInset, (tableTopY - topThick) / 2, d / 2 - legInset],
    ];
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* 4 legs */}
        {legPositions.map((pos, i) => (
          <mesh key={i} position={pos} castShadow>
            <boxGeometry args={[legW, tableTopY - topThick, legW]} />
            <meshStandardMaterial color={woodColor} roughness={0.5} metalness={0.08} />
          </mesh>
        ))}
        {/* Table surface */}
        <mesh position={[0, tableTopY - topThick / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, topThick, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Table apron — front/back */}
        {[-1, 1].map((side) => (
          <mesh key={`apron-fb-${side}`} position={[0, tableTopY - topThick - 1.5 * S, side * (d / 2 - legInset)]}>
            <boxGeometry args={[w - 2 * legInset, 3 * S, 0.5 * S]} />
            <meshStandardMaterial color={woodColor} roughness={0.5} metalness={0.08} />
          </mesh>
        ))}
        {/* Table apron — left/right */}
        {[-1, 1].map((side) => (
          <mesh key={`apron-lr-${side}`} position={[side * (w / 2 - legInset), tableTopY - topThick - 1.5 * S, 0]}>
            <boxGeometry args={[0.5 * S, 3 * S, d - 2 * legInset]} />
            <meshStandardMaterial color={woodColor} roughness={0.5} metalness={0.08} />
          </mesh>
        ))}
        {/* Linen top */}
        <mesh position={[0, tableTopY + 0.05, 0]} receiveShadow>
          <boxGeometry args={[w + clothOverhang * 2, 0.08, d + clothOverhang * 2]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} />
        </mesh>
        {/* Linen drape — front */}
        <mesh position={[0, tableTopY - clothDrop / 2, d / 2 + clothOverhang]} receiveShadow>
          <boxGeometry args={[w + clothOverhang * 2, clothDrop, 0.08]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} />
        </mesh>
        {/* Linen drape — back */}
        <mesh position={[0, tableTopY - clothDrop / 2, -d / 2 - clothOverhang]} receiveShadow>
          <boxGeometry args={[w + clothOverhang * 2, clothDrop, 0.08]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} />
        </mesh>
        {/* Linen drape — left */}
        <mesh position={[-w / 2 - clothOverhang, tableTopY - clothDrop / 2, 0]} receiveShadow>
          <boxGeometry args={[0.08, clothDrop, d + clothOverhang * 2]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} />
        </mesh>
        {/* Linen drape — right */}
        <mesh position={[w / 2 + clothOverhang, tableTopY - clothDrop / 2, 0]} receiveShadow>
          <boxGeometry args={[0.08, clothDrop, d + clothOverhang * 2]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} />
        </mesh>
        {settings.showLabels && <FurnitureLabel label={obj.label} y={tableTopY + 2 * S} />}
      </group>
    );
  }

  // ── Chairs — Chiavari style: 4 tapered legs, thin seat, elegant back with slats ──
  if (category === "chair") {
    const seatY = 18 * S * H_MULT; // seat at 18 inches
    const seatThick = 1.2 * S;
    const backTopY = h3d;
    const backH = backTopY - seatY;
    const legR = 0.5 * S;
    const legInset = 1.5 * S;
    const backThick = 1 * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Legs — style-dependent */}
        {settings.chairStyle !== "ghost" && ([
          [-w / 2 + legInset, -d / 2 + legInset],
          [w / 2 - legInset, -d / 2 + legInset],
          [-w / 2 + legInset, d / 2 - legInset],
          [w / 2 - legInset, d / 2 - legInset],
        ] as [number, number][]).map(([lx, lz], i) => (
          <mesh key={`leg-${i}`} position={[lx, seatY / 2, lz]} castShadow={settings.showShadows}>
            <cylinderGeometry args={[settings.chairStyle === "folding" ? legR * 0.5 : legR * 0.7, legR, seatY, 6]} />
            <meshStandardMaterial color={chairLeg} roughness={0.45} metalness={0.1} />
          </mesh>
        ))}
        {/* Folding chair X-brace */}
        {settings.chairStyle === "folding" && (
          <>
            <mesh position={[0, seatY * 0.5, 0]} rotation={[0.3, 0, 0]} castShadow={settings.showShadows}>
              <boxGeometry args={[0.3 * S, seatY * 0.9, 0.3 * S]} />
              <meshStandardMaterial color={chairLeg} roughness={0.4} metalness={0.15} />
            </mesh>
            <mesh position={[0, seatY * 0.5, 0]} rotation={[-0.3, 0, 0]} castShadow={settings.showShadows}>
              <boxGeometry args={[0.3 * S, seatY * 0.9, 0.3 * S]} />
              <meshStandardMaterial color={chairLeg} roughness={0.4} metalness={0.15} />
            </mesh>
          </>
        )}
        {/* Seat */}
        <mesh position={[0, seatY, 0]} castShadow={settings.showShadows} receiveShadow>
          <boxGeometry args={[w, settings.chairStyle === "folding" ? seatThick * 0.6 : seatThick, d]} />
          <meshStandardMaterial
            color={chairGold}
            roughness={settings.chairStyle === "ghost" ? 0.1 : 0.6}
            metalness={settings.chairStyle === "ghost" ? 0.1 : 0.08}
            transparent={settings.chairStyle === "ghost"}
            opacity={settings.chairStyle === "ghost" ? 0.4 : 1}
          />
        </mesh>
        {/* Chair back — style depends on settings */}
        {settings.chairStyle === "solid-back" && (
          <mesh position={[0, seatY + backH / 2 + seatThick / 2, d / 2 - backThick / 2]} castShadow={settings.showShadows} receiveShadow>
            <boxGeometry args={[w, backH, backThick]} />
            <meshStandardMaterial color={chairBack} roughness={0.5} metalness={0.06} />
          </mesh>
        )}
        {settings.chairStyle === "chiavari" && (
          <>
            {/* 3 vertical slats */}
            {[-1, 0, 1].map((offset) => (
              <mesh key={`slat-${offset}`} position={[offset * (w * 0.28), seatY + backH / 2 + seatThick / 2, d / 2 - backThick / 2]} castShadow={settings.showShadows} receiveShadow>
                <boxGeometry args={[w * 0.12, backH, backThick]} />
                <meshStandardMaterial color={chairBack} roughness={0.45} metalness={0.1} />
              </mesh>
            ))}
            {/* Rounded top rail — cylinder rotated horizontal */}
            <mesh position={[0, seatY + backH + seatThick / 2, d / 2 - backThick / 2]} rotation={[0, 0, Math.PI / 2]} castShadow={settings.showShadows} receiveShadow>
              <cylinderGeometry args={[backThick * 0.8, backThick * 0.8, w, 8]} />
              <meshStandardMaterial color={chairBack} roughness={0.45} metalness={0.1} />
            </mesh>
            {/* Cross-stretchers between legs */}
            {/* Front stretcher */}
            <mesh position={[0, seatY * 0.33, -d / 2 + legInset]} castShadow={settings.showShadows}>
              <boxGeometry args={[w - 2 * legInset, 0.4 * S, 0.4 * S]} />
              <meshStandardMaterial color={chairLeg} roughness={0.45} metalness={0.1} />
            </mesh>
            {/* Back stretcher */}
            <mesh position={[0, seatY * 0.33, d / 2 - legInset]} castShadow={settings.showShadows}>
              <boxGeometry args={[w - 2 * legInset, 0.4 * S, 0.4 * S]} />
              <meshStandardMaterial color={chairLeg} roughness={0.45} metalness={0.1} />
            </mesh>
            {/* Side stretchers */}
            {[-1, 1].map((side) => (
              <mesh key={`sstr-${side}`} position={[side * (w / 2 - legInset), seatY * 0.33, 0]} castShadow={settings.showShadows}>
                <boxGeometry args={[0.4 * S, 0.4 * S, d - 2 * legInset]} />
                <meshStandardMaterial color={chairLeg} roughness={0.45} metalness={0.1} />
              </mesh>
            ))}
            {/* Seat cushion pad */}
            <mesh position={[0, seatY + seatThick * 0.7, 0]} receiveShadow>
              <boxGeometry args={[w + 0.3 * S, seatThick * 0.5, d + 0.3 * S]} />
              <meshStandardMaterial color={linenColor} roughness={0.85} metalness={0} />
            </mesh>
          </>
        )}
        {settings.chairStyle === "folding" && (
          <>
            {/* Thin back panel */}
            <mesh position={[0, seatY + backH * 0.4 + seatThick / 2, d / 2 - backThick / 2]} castShadow={settings.showShadows} receiveShadow>
              <boxGeometry args={[w * 0.9, backH * 0.8, backThick * 0.5]} />
              <meshStandardMaterial color={chairBack} roughness={0.7} metalness={0.02} />
            </mesh>
          </>
        )}
        {settings.chairStyle === "ghost" && (
          <mesh position={[0, seatY + backH / 2 + seatThick / 2, d / 2 - backThick / 2]} castShadow={false} receiveShadow>
            <boxGeometry args={[w, backH, backThick]} />
            <meshStandardMaterial color={chairBack} roughness={0.1} metalness={0.1} transparent opacity={0.4} />
          </mesh>
        )}
        {settings.showLabels && <FurnitureLabel label={obj.label} y={backTopY + 2 * S} />}
      </group>
    );
  }

  // ── Sofas — cushions, armrests, visible feet ──
  if (category === "sofa") {
    const footH = 3 * S;
    const seatTopY = 18 * S * H_MULT;
    const cushionH = seatTopY - footH;
    const cushionD = d * 0.65;
    const backH = 14 * S;
    const backThick = 3 * S;
    const armW = 3 * S;
    const armH = 10 * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* 4 small feet */}
        {([[-1,-1],[-1,1],[1,-1],[1,1]] as [number,number][]).map(([sx, sz], i) => (
          <mesh key={`foot-${i}`} position={[sx * (w / 2 - 2 * S), footH / 2, sz * (cushionD / 2 - 1 * S)]} castShadow>
            <cylinderGeometry args={[0.8 * S, 1 * S, footH, 6]} />
            <meshStandardMaterial color={darkColor} roughness={0.5} metalness={0.1} />
          </mesh>
        ))}
        {/* Seat base */}
        <mesh position={[0, footH + cushionH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w - armW * 2, cushionH, cushionD]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Seat cushion divider line */}
        <mesh position={[0, seatTopY + 0.02, 0]}>
          <boxGeometry args={[0.1 * S, 0.04, cushionD * 0.9]} />
          <meshStandardMaterial color={strokeColor} roughness={1} metalness={0} />
        </mesh>
        {/* Back rest */}
        <mesh position={[0, seatTopY + backH / 2, -cushionD / 2 - backThick / 2 + 1 * S]} castShadow receiveShadow>
          <boxGeometry args={[w - armW * 2, backH, backThick]} />
          <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Armrests */}
        {[-1, 1].map((side) => (
          <mesh key={`arm-${side}`} position={[side * (w / 2 - armW / 2), seatTopY + armH / 2, -backThick / 2]} castShadow receiveShadow>
            <boxGeometry args={[armW, armH, cushionD + backThick - 1 * S]} />
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
          </mesh>
        ))}
        {settings.showLabels && <FurnitureLabel label={obj.label} y={seatTopY + backH + 2 * S} />}
      </group>
    );
  }

  // ── Service counters — counter with overhang, front panel, back shelf ──
  if (category === "service-counter") {
    const counterH = h3d;
    const topThick = 1.5 * S;
    const overhang = 2 * S;
    const panelInset = 1 * S;
    const isBar = obj.furnitureId === "bar";
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Main body */}
        <mesh position={[0, (counterH - topThick) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, counterH - topThick, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Countertop with overhang */}
        <mesh position={[0, counterH - topThick / 2, overhang / 2]} castShadow receiveShadow>
          <boxGeometry args={[w + overhang, topThick, d + overhang]} />
          <meshStandardMaterial color={strokeColor} roughness={0.4} metalness={0.12} />
        </mesh>
        {/* Front decorative panel inset */}
        <mesh position={[0, (counterH - topThick) / 2, d / 2 + 0.05]}>
          <boxGeometry args={[w - panelInset * 2, counterH - topThick - panelInset * 2, 0.1]} />
          <meshStandardMaterial color={strokeColor} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Bar foot rail */}
        {isBar && (
          <mesh position={[0, 6 * S, d / 2 + 1.5 * S]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.5 * S, 0.5 * S, w - 4 * S, 8]} />
            <meshStandardMaterial color={getCachedColor("#b8a080")} roughness={0.25} metalness={0.35} />
          </mesh>
        )}
        {settings.showLabels && <FurnitureLabel label={obj.label} y={counterH + 2 * S} />}
      </group>
    );
  }

  // ── Flat surfaces — dance floor with checkerboard tiles, aisle runner ──
  if (category === "flat-surface") {
    const isDanceFloor = obj.furnitureId === "dance-floor";
    const floorH = 1.5 * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Main surface — light base color for dance floor */}
        <mesh position={[0, floorH / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[w, floorH, d]} />
          <meshStandardMaterial
            color={isDanceFloor ? tileLight : fillColor}
            roughness={isDanceFloor ? 0.15 : pbr.roughness}
            metalness={isDanceFloor ? 0.08 : pbr.metalness}
          />
        </mesh>
        {/* Raised border frame — 4 rails */}
        {isDanceFloor && (
          <>
            <mesh position={[0, floorH / 2 + 0.3 * S, d / 2 + 0.3 * S]} castShadow>
              <boxGeometry args={[w + 0.8 * S, floorH + 0.6 * S, 0.6 * S]} />
              <meshStandardMaterial color={strokeColor} roughness={0.4} metalness={0.12} />
            </mesh>
            <mesh position={[0, floorH / 2 + 0.3 * S, -d / 2 - 0.3 * S]} castShadow>
              <boxGeometry args={[w + 0.8 * S, floorH + 0.6 * S, 0.6 * S]} />
              <meshStandardMaterial color={strokeColor} roughness={0.4} metalness={0.12} />
            </mesh>
            <mesh position={[-w / 2 - 0.3 * S, floorH / 2 + 0.3 * S, 0]} castShadow>
              <boxGeometry args={[0.6 * S, floorH + 0.6 * S, d]} />
              <meshStandardMaterial color={strokeColor} roughness={0.4} metalness={0.12} />
            </mesh>
            <mesh position={[w / 2 + 0.3 * S, floorH / 2 + 0.3 * S, 0]} castShadow>
              <boxGeometry args={[0.6 * S, floorH + 0.6 * S, d]} />
              <meshStandardMaterial color={strokeColor} roughness={0.4} metalness={0.12} />
            </mesh>
          </>
        )}
        {/* Non-dance-floor edge trim */}
        {!isDanceFloor && (
          <mesh position={[0, floorH + 0.05, 0]}>
            <boxGeometry args={[w + 0.3 * S, 0.1, d + 0.3 * S]} />
            <meshStandardMaterial color={strokeColor} roughness={0.5} metalness={0.1} />
          </mesh>
        )}
        {/* Dance floor checkerboard — dark tiles only (light is the base) */}
        {isDanceFloor && (() => {
          const tileSizeW = Math.max(w / 5, 2);
          const tileSizeD = Math.max(d / 5, 2);
          const cols = Math.floor(w / tileSizeW);
          const rows = Math.floor(d / tileSizeD);
          const tiles: JSX.Element[] = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if ((r + c) % 2 === 1) {
                const tx = -w / 2 + tileSizeW / 2 + c * tileSizeW;
                const tz = -d / 2 + tileSizeD / 2 + r * tileSizeD;
                tiles.push(
                  <mesh key={`tile-${r}-${c}`} position={[tx, floorH + 0.04, tz]}>
                    <boxGeometry args={[tileSizeW - 0.03, 0.04, tileSizeD - 0.03]} />
                    <meshStandardMaterial color={tileDark} roughness={0.15} metalness={0.08} />
                  </mesh>
                );
              }
            }
          }
          return tiles;
        })()}
        {settings.showLabels && <FurnitureLabel label={obj.label} y={floorH + 2 * S} />}
      </group>
    );
  }

  // ── Stage — platform with stairs, monitor speakers, carpet surface ──
  if (category === "stage") {
    const trimH = 1.5 * S;
    const stepCount = 3;
    const stepH = h3d / stepCount;
    const stepW = 3 * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Main platform */}
        <mesh position={[0, h3d / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h3d, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Carpet top surface */}
        <mesh position={[0, h3d + 0.05, 0]} receiveShadow>
          <boxGeometry args={[w, 0.1, d]} />
          <meshStandardMaterial color={carpetColor} roughness={0.95} metalness={0} />
        </mesh>
        {/* Carpet accent border inset */}
        <mesh position={[0, h3d + 0.12, 0]}>
          <boxGeometry args={[w - 2 * S, 0.02, d - 2 * S]} />
          <meshStandardMaterial color={getCachedColor("#5a4f45")} roughness={0.9} metalness={0} />
        </mesh>
        {/* Front edge trim */}
        <mesh position={[0, h3d - trimH / 2, d / 2 + 0.1]}>
          <boxGeometry args={[w + 0.2, trimH, 0.2]} />
          <meshStandardMaterial color={strokeColor} roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Side edge trims */}
        {[-1, 1].map((side) => (
          <mesh key={`strim-${side}`} position={[side * (w / 2 + 0.1), h3d - trimH / 2, 0]}>
            <boxGeometry args={[0.2, trimH, d + 0.2]} />
            <meshStandardMaterial color={strokeColor} roughness={0.6} metalness={0.05} />
          </mesh>
        ))}
        {/* Stage skirt — front */}
        <mesh position={[0, h3d / 2, d / 2 + 0.3]}>
          <boxGeometry args={[w + 0.4, h3d, 0.1]} />
          <meshStandardMaterial color={darkColor} roughness={0.9} metalness={0} />
        </mesh>
        {/* 3-step staircase on left side */}
        {Array.from({ length: stepCount }).map((_, i) => (
          <mesh key={`step-${i}`} position={[-w / 2 - stepW / 2, stepH * (i + 0.5), 0]} castShadow receiveShadow>
            <boxGeometry args={[stepW, stepH - 0.1 * S, d * 0.4]} />
            <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
          </mesh>
        ))}
        {/* Monitor wedge speakers at front edges */}
        {[-1, 1].map((side) => (
          <group key={`speaker-${side}`}>
            <mesh position={[side * (w / 2 - 3 * S), h3d + 1 * S, d / 2 - 1.5 * S]} rotation={[-0.3, 0, 0]} castShadow>
              <boxGeometry args={[4 * S, 2 * S, 3 * S]} />
              <meshStandardMaterial color={darkColor} roughness={0.6} metalness={0.1} />
            </mesh>
            {/* Speaker grille */}
            <mesh position={[side * (w / 2 - 3 * S), h3d + 1.2 * S, d / 2 - 0.3 * S]} rotation={[-0.3, 0, 0]}>
              <boxGeometry args={[3.5 * S, 1.5 * S, 0.1]} />
              <meshStandardMaterial color={strokeColor} roughness={0.8} metalness={0.05} />
            </mesh>
          </group>
        ))}
        {settings.showLabels && <FurnitureLabel label={obj.label} y={h3d + 2 * S} />}
      </group>
    );
  }

  // ── DJ Booth — console with turntables, laptop, LED strip ──
  if (category === "dj-booth") {
    const consoleH = h3d;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Main console body */}
        <mesh position={[0, consoleH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, consoleH, d]} />
          <meshStandardMaterial color={darkColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Front facade */}
        <mesh position={[0, consoleH / 2, d / 2 + 0.15]} castShadow>
          <boxGeometry args={[w + 0.5 * S, consoleH - 2 * S, 0.3]} />
          <meshStandardMaterial color={strokeColor} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* LED strip on facade */}
        <mesh position={[0, consoleH - 1.5 * S, d / 2 + 0.35]}>
          <boxGeometry args={[w + 0.3 * S, 0.5 * S, 0.15]} />
          <meshStandardMaterial color={ledColor} emissive={ledColor} emissiveIntensity={0.8} roughness={0.1} metalness={0} />
        </mesh>
        {/* Countertop */}
        <mesh position={[0, consoleH, 0]} castShadow receiveShadow>
          <boxGeometry args={[w + 1 * S, 1 * S, d + 2 * S]} />
          <meshStandardMaterial color={strokeColor} roughness={0.4} metalness={0.1} />
        </mesh>
        {/* Turntable platters */}
        {[-1, 1].map((side) => (
          <group key={`tt-${side}`}>
            <mesh position={[side * w * 0.25, consoleH + 1.2 * S, 0]}>
              <cylinderGeometry args={[w * 0.18, w * 0.18, 0.5 * S, 16]} />
              <meshStandardMaterial color={darkColor} roughness={0.2} metalness={0.3} />
            </mesh>
            {/* Spindle */}
            <mesh position={[side * w * 0.25, consoleH + 1.8 * S, 0]}>
              <cylinderGeometry args={[0.3 * S, 0.3 * S, 1 * S, 6]} />
              <meshStandardMaterial color={strokeColor} roughness={0.3} metalness={0.2} />
            </mesh>
          </group>
        ))}
        {/* Mixer between turntables */}
        <mesh position={[0, consoleH + 1 * S, 0]} castShadow>
          <boxGeometry args={[w * 0.12, 0.8 * S, d * 0.35]} />
          <meshStandardMaterial color={darkColor} roughness={0.3} metalness={0.15} />
        </mesh>
        {/* Laptop screen */}
        <mesh position={[0, consoleH + 3 * S, -d * 0.15]} rotation={[-0.3, 0, 0]} castShadow>
          <boxGeometry args={[w * 0.25, 3 * S, 0.15 * S]} />
          <meshStandardMaterial color={darkColor} roughness={0.3} metalness={0.1} emissive={getCachedColor("#1a1a2e")} emissiveIntensity={0.5} />
        </mesh>
        {settings.showLabels && <FurnitureLabel label={obj.label} y={consoleH + 5 * S} />}
      </group>
    );
  }

  // ── Photo Booth — frame structure: 4 tall corner posts + top frame + backdrop ──
  if (category === "photo-booth") {
    const postRadius = 1.2 * S;
    const postH = h3d;
    const topThick = 2 * S;
    const cornerOffsets: [number, number][] = [
      [-w / 2 + postRadius, -d / 2 + postRadius],
      [w / 2 - postRadius, -d / 2 + postRadius],
      [-w / 2 + postRadius, d / 2 - postRadius],
      [w / 2 - postRadius, d / 2 - postRadius],
    ];
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* 4 corner posts */}
        {cornerOffsets.map(([cx, cz], i) => (
          <mesh key={i} position={[cx, postH / 2, cz]} castShadow receiveShadow>
            <cylinderGeometry args={[postRadius, postRadius, postH, 8]} />
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
          </mesh>
        ))}
        {/* Top frame */}
        <mesh position={[0, postH - topThick / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, topThick, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Backdrop curtain */}
        <mesh position={[0, postH / 2, -d / 2 + 0.5 * S]}>
          <boxGeometry args={[w - 2 * S, postH - 4 * S, 0.3 * S]} />
          <meshStandardMaterial color={linenColor} roughness={0.95} metalness={0} transparent opacity={0.9} />
        </mesh>
        {/* Banner across top frame */}
        <mesh position={[0, postH - topThick - 2 * S, d / 2 - 1 * S]}>
          <boxGeometry args={[w * 0.7, 3 * S, 0.2 * S]} />
          <meshStandardMaterial color={bannerRed} roughness={0.8} metalness={0} />
        </mesh>
        {/* Camera on tripod — in front of booth */}
        {/* Tripod legs */}
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, i) => (
          <mesh key={`tripod-${i}`}
            position={[
              Math.sin(angle) * 2 * S,
              postH * 0.2,
              d / 2 + 6 * S + Math.cos(angle) * 2 * S,
            ]}
            rotation={[0.25 * Math.cos(angle), 0, 0.25 * Math.sin(angle)]}
            castShadow
          >
            <cylinderGeometry args={[0.2 * S, 0.2 * S, postH * 0.45, 4]} />
            <meshStandardMaterial color={darkColor} roughness={0.5} metalness={0.15} />
          </mesh>
        ))}
        {/* Camera body */}
        <mesh position={[0, postH * 0.4, d / 2 + 6 * S]} castShadow>
          <boxGeometry args={[2.5 * S, 2 * S, 2 * S]} />
          <meshStandardMaterial color={darkColor} roughness={0.4} metalness={0.15} />
        </mesh>
        {/* Camera lens */}
        <mesh position={[0, postH * 0.4, d / 2 + 6 * S - 1.5 * S]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.6 * S, 0.8 * S, 1.5 * S, 8]} />
          <meshStandardMaterial color={darkColor} roughness={0.3} metalness={0.3} />
        </mesh>
        {settings.showLabels && <FurnitureLabel label={obj.label} y={postH + 2 * S} />}
      </group>
    );
  }

  // ── Arch — elegant: two tapered columns + curved arc + capitals + finials ──
  if (category === "arch") {
    const postRadius = 1.8 * S;
    const postH = h3d;
    const arcSegments = 12;
    const leftColX = -w / 2 + postRadius;
    const rightColX = w / 2 - postRadius;
    const arcSpan = rightColX - leftColX;
    const arcRise = 6 * S;
    const segDepth = 3 * S;
    const segHeight = 3 * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Column base plinths */}
        {[leftColX, rightColX].map((cx, i) => (
          <mesh key={`plinth-${i}`} position={[cx, 1.5 * S, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[postRadius * 1.3, postRadius * 1.4, 3 * S, 12]} />
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
          </mesh>
        ))}
        {/* Columns — tapered */}
        {[leftColX, rightColX].map((cx, i) => (
          <mesh key={`col-${i}`} position={[cx, postH / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[postRadius * 0.75, postRadius, postH, 12]} />
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
          </mesh>
        ))}
        {/* Column capitals */}
        {[leftColX, rightColX].map((cx, i) => (
          <mesh key={`cap-${i}`} position={[cx, postH - 1.5 * S, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[postRadius * 1.2, postRadius * 0.85, 3 * S, 12]} />
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
          </mesh>
        ))}
        {/* Decorative sphere finials on capitals */}
        {[leftColX, rightColX].map((cx, i) => (
          <mesh key={`finial-${i}`} position={[cx, postH + postRadius * 0.4, 0]} castShadow>
            <sphereGeometry args={[postRadius * 0.4, 8, 8]} />
            <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
          </mesh>
        ))}
        {/* Curved arc segments */}
        {Array.from({ length: arcSegments }).map((_, i) => {
          const t = (i + 0.5) / arcSegments;
          const angle = Math.PI * t;
          const segX = leftColX + arcSpan * t;
          const segY = postH + arcRise * Math.sin(angle);
          const nextT = (i + 1.5) / arcSegments;
          const nextAngle = Math.PI * nextT;
          const dx = arcSpan / arcSegments;
          const dy = arcRise * (Math.sin(nextAngle) - Math.sin(angle));
          const rotZ = Math.atan2(dy, dx);
          const segW = Math.sqrt(dx * dx + dy * dy) * 1.05;
          return (
            <mesh key={`arc-${i}`} position={[segX, segY, 0]} rotation={[0, 0, rotZ]} castShadow receiveShadow>
              <boxGeometry args={[segW, segHeight, segDepth]} />
              <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
            </mesh>
          );
        })}
        {/* Keystone at apex */}
        <mesh position={[0, postH + arcRise, 0]} castShadow>
          <sphereGeometry args={[2.5 * S, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {settings.showLabels && <FurnitureLabel label={obj.label} y={postH + arcRise + 3 * S} />}
      </group>
    );
  }

  // ── Flower Arrangement — vase with individual flower buds on stems ──
  if (category === "flower-arrangement") {
    const baseR = Math.min(w, d) / 2;
    const vaseH = h3d * 0.5;
    const neckR = baseR * 0.35;
    const buds = [
      { angle: 0, hFrac: 1.0, r: 0.3 },
      { angle: 1.0, hFrac: 0.85, r: 0.25 },
      { angle: 2.1, hFrac: 0.95, r: 0.28 },
      { angle: 3.2, hFrac: 0.75, r: 0.22 },
      { angle: 4.3, hFrac: 0.9, r: 0.3 },
      { angle: 5.4, hFrac: 0.8, r: 0.2 },
    ];
    const maxStemH = baseR * 1.8;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Vase base — tapered cylinder */}
        <mesh position={[0, vaseH / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[neckR, baseR * 0.55, vaseH, 12]} />
          <meshStandardMaterial color={strokeColor} roughness={0.3} metalness={0.15} />
        </mesh>
        {/* Vase rim */}
        <mesh position={[0, vaseH, 0]} castShadow>
          <cylinderGeometry args={[neckR * 1.3, neckR, 1 * S, 12]} />
          <meshStandardMaterial color={strokeColor} roughness={0.3} metalness={0.15} />
        </mesh>
        {/* Individual flower stems + buds */}
        {buds.map((bud, i) => {
          const stemH = maxStemH * bud.hFrac;
          const offsetX = Math.cos(bud.angle) * neckR * 0.5;
          const offsetZ = Math.sin(bud.angle) * neckR * 0.5;
          return (
            <group key={`flower-${i}`}>
              {/* Stem */}
              <mesh position={[offsetX, vaseH + stemH / 2, offsetZ]} castShadow>
                <cylinderGeometry args={[0.15 * S, 0.15 * S, stemH, 4]} />
                <meshStandardMaterial color={flowerStemGreen} roughness={0.7} metalness={0} />
              </mesh>
              {/* Bud */}
              <mesh position={[offsetX, vaseH + stemH, offsetZ]} castShadow>
                <sphereGeometry args={[baseR * bud.r, 8, 8]} />
                <meshStandardMaterial color={fillColor} roughness={0.7} metalness={0} />
              </mesh>
            </group>
          );
        })}
        {/* Flat leaf accents angled outward */}
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
          <mesh key={`leaf-${i}`} position={[
            Math.cos(angle) * baseR * 0.4,
            vaseH + 2 * S,
            Math.sin(angle) * baseR * 0.4,
          ]} rotation={[0.3, angle, 0.4]}>
            <boxGeometry args={[baseR * 0.35, 0.1 * S, baseR * 0.6]} />
            <meshStandardMaterial color={flowerStemGreen} roughness={0.8} metalness={0} />
          </mesh>
        ))}
        {settings.showLabels && <FurnitureLabel label={obj.label} y={vaseH + maxStemH + baseR * 0.3 + 2 * S} />}
      </group>
    );
  }

  // ── Draping — tall fabric panels with swag effect + gather rings ──
  if (category === "draping") {
    const panelCount = Math.min(10, Math.max(2, Math.floor(w / (10 * S))));
    const panelW = w / panelCount;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Top rod */}
        <mesh position={[0, h3d, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.3 * S, 0.3 * S, w + 2 * S, 8]} />
          <meshStandardMaterial color={strokeColor} roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Fabric panels — upper (narrow) + lower (wider) for swag effect */}
        {Array.from({ length: panelCount }).map((_, i) => {
          const cx = -w / 2 + panelW / 2 + i * panelW;
          return (
            <group key={`panel-${i}`}>
              {/* Upper portion — narrower, gathered */}
              <mesh position={[cx, h3d * 0.8, 0]} castShadow receiveShadow>
                <boxGeometry args={[panelW * 0.7, h3d * 0.4, 1.2 * S]} />
                <meshStandardMaterial color={fillColor} roughness={0.95} metalness={0} transparent opacity={0.8} side={DoubleSide} />
              </mesh>
              {/* Lower portion — wider, flowing */}
              <mesh position={[cx, h3d * 0.3, 0]} castShadow receiveShadow>
                <boxGeometry args={[panelW - 0.2 * S, h3d * 0.6, 2 * S]} />
                <meshStandardMaterial color={fillColor} roughness={0.95} metalness={0} transparent opacity={0.8} side={DoubleSide} />
              </mesh>
              {/* Gather ring at attachment point */}
              <mesh position={[cx, h3d - 0.5 * S, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1 * S, 0.3 * S, 6, 8]} />
                <meshStandardMaterial color={strokeColor} roughness={0.3} metalness={0.25} />
              </mesh>
            </group>
          );
        })}
        {settings.showLabels && <FurnitureLabel label={obj.label} y={h3d + 2 * S} />}
      </group>
    );
  }

  // ── Uplighting — fixture with glow cone ──
  if (category === "uplighting") {
    const lightR = Math.min(w, d) / 2;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Fixture body */}
        <mesh position={[0, h3d / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[lightR * 0.8, lightR, h3d, 12]} />
          <meshStandardMaterial color={darkColor} roughness={0.5} metalness={0.15} />
        </mesh>
        {/* Lens cap */}
        <mesh position={[0, h3d + 0.1, 0]}>
          <cylinderGeometry args={[lightR * 0.6, lightR * 0.8, 0.3 * S, 12]} />
          <meshStandardMaterial color={fillColor} roughness={0.2} metalness={0.1} emissive={fillColor} emissiveIntensity={0.3} />
        </mesh>
        {/* Light glow cone (transparent) */}
        <mesh position={[0, h3d + 8 * S, 0]}>
          <coneGeometry args={[4 * S, 16 * S, 16, 1, true]} />
          <meshStandardMaterial color={fillColor} transparent opacity={0.06} side={DoubleSide} depthWrite={false} />
        </mesh>
        {settings.showLabels && <FurnitureLabel label={obj.label} y={h3d + 2 * S} />}
      </group>
    );
  }

  // ── Default fallback: circle or rect ──
  if (obj.shape === "circle") {
    const radius = (obj.radius || obj.width / 2) * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        <mesh position={[0, h3d / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, h3d, 32]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {settings.showLabels && <FurnitureLabel label={obj.label} y={h3d + 2 * S} />}
      </group>
    );
  }

  // Default rectangular fallback with legs
  const halfH = h3d / 2;
  if (h3d < 2 * S) {
    return (
      <group position={[posX, 0.5 * S, posZ]} rotation={[0, rotY, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[w, 1 * S, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
      </group>
    );
  }

  const legInset = 2 * S;
  const legPositions: [number, number, number][] = [
    [-w / 2 + legInset, 0, -d / 2 + legInset],
    [w / 2 - legInset, 0, -d / 2 + legInset],
    [-w / 2 + legInset, 0, d / 2 - legInset],
    [w / 2 - legInset, 0, d / 2 - legInset],
  ];

  return (
    <group position={[posX, halfH, posZ]} rotation={[0, rotY, 0]}>
      <mesh position={[0, halfH - 1 * S, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 2 * S, d]} />
        <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
      </mesh>
      {legPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[1.2 * S, h3d - 2 * S, 1.2 * S]} />
          <meshStandardMaterial color={strokeColor} roughness={0.5} metalness={0.1} />
        </mesh>
      ))}
      {settings.showLabels && <FurnitureLabel label={obj.label} y={h3d + 2 * S} />}
    </group>
  );
}

function RoomFloor({ obj, originX, originY, settings, showWalls = true, floorOverride }: { obj: ParsedObject; originX: number; originY: number; settings: View3DSettings; showWalls?: boolean; floorOverride?: { color: string; roughness: number; metalness: number } }) {
  // Memoize shape to avoid re-creating on every render
  const floorShape = useMemo(() => {
    if (!obj.points || obj.points.length < 3) return null;
    // Points are already absolute canvas coordinates (precomputed in parseCanvasJSON).
    // Negate Y because the Shape (XY plane) is rotated -π/2 around X,
    // mapping Shape Y → World -Z.  Furniture uses posZ = +(canvasY - originY),
    // so we negate here to keep room floor and furniture in the same Z direction.
    const shapePoints = obj.points.map(
      ([x, y]) => new Vector2((x - originX) * S, -(y - originY) * S)
    );
    return new Shape(shapePoints);
  }, [obj.points, originX, originY]);

  // Compute wall segments from polygon edges in world space.
  // Points are already absolute canvas coords. Walls are placed directly in
  // world coords (not via Shape rotation), so Z = +(canvasY - originY) * S.
  const wallSegments = useMemo(() => {
    if (!obj.points || obj.points.length < 3) return [];
    const segments: { x1: number; z1: number; x2: number; z2: number; length: number; angle: number; cx: number; cz: number }[] = [];
    const pts = obj.points.map(([x, y]) => ({
      x: (x - originX) * S,
      z: (y - originY) * S,
    }));
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      segments.push({
        x1: a.x, z1: a.z, x2: b.x, z2: b.z,
        length,
        angle,
        cx: (a.x + b.x) / 2,
        cz: (a.z + b.z) / 2,
      });
    }
    return segments;
  }, [obj.points, originX, originY]);

  if (!floorShape) return null;

  const wallThickness = 0.15;
  const floorMat = floorOverride ?? FLOOR_MATERIALS[settings.floorMaterial];

  return (
    <group>
      {/* Floor — key forces remount when material changes to ensure R3F applies new color */}
      <mesh key={`floor-${floorMat.color}-${floorMat.roughness}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <extrudeGeometry args={[floorShape, { depth: 0.02, bevelEnabled: false }]} />
        <meshStandardMaterial color={floorMat.color} side={DoubleSide} roughness={floorMat.roughness} metalness={floorMat.metalness} />
      </mesh>
      {/* Walls, baseboard, crown — only when venue has walls */}
      {showWalls && (
        <>
          {/* Baseboard trim along walls */}
          {wallSegments.map((seg, i) => (
            <mesh
              key={`base-${i}`}
              position={[seg.cx, 0.15, seg.cz]}
              rotation={[0, -seg.angle, 0]}
            >
              <boxGeometry args={[seg.length, 0.3, wallThickness + 0.06]} />
              <meshStandardMaterial color="#d5cdc2" roughness={0.6} metalness={0.05} />
            </mesh>
          ))}
          {/* Walls — subtle translucent with slight warmth */}
          {wallSegments.map((seg, i) => (
            <mesh
              key={`wall-${i}`}
              position={[seg.cx, WALL_HEIGHT / 2, seg.cz]}
              rotation={[0, -seg.angle, 0]}
              receiveShadow
              renderOrder={1}
            >
              <boxGeometry args={[seg.length, WALL_HEIGHT, wallThickness]} />
              <meshStandardMaterial
                color="#f0ebe4"
                roughness={0.92}
                metalness={0}
                transparent
                opacity={0.2}
                depthWrite={false}
              />
            </mesh>
          ))}
          {/* Crown molding at wall top */}
          {wallSegments.map((seg, i) => (
            <mesh
              key={`crown-${i}`}
              position={[seg.cx, WALL_HEIGHT - 0.08, seg.cz]}
              rotation={[0, -seg.angle, 0]}
            >
              <boxGeometry args={[seg.length, 0.16, wallThickness + 0.04]} />
              <meshStandardMaterial color="#e0d8ce" roughness={0.5} metalness={0.06} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/** Max shadow-casting point lights to protect GPU */
const MAX_SHADOW_LIGHTS = 4;

/** Downward-pointing types that get cone beams */
const DOWNLIGHT_TYPES = new Set(["spotlight", "pinspot", "gobo"]);

/** Ground-level uplight types that wash walls */
const UPLIGHT_TYPES = new Set(["uplight", "wash"]);

function LightingZone3D({
  zone,
  originX,
  originY,
  canvasWidth,
  canvasHeight,
  castShadow,
}: {
  zone: LightingZone;
  originX: number;
  originY: number;
  canvasWidth: number;
  canvasHeight: number;
  castShadow: boolean;
}) {
  const px = (zone.x / 100) * canvasWidth;
  const py = (zone.y / 100) * canvasHeight;
  const posX = (px - originX) * S;
  const posZ = (py - originY) * S;
  const intensity = (zone.intensity / 100) * 3;
  const color = getCachedColor(zone.color);
  const mountHeight = (zone.height ?? 8);  // in feet (= world units since S = 1/12)
  const spreadRad = ((zone.spread ?? 45) * Math.PI) / 180;
  const isDownlight = DOWNLIGHT_TYPES.has(zone.type);
  const isUplight = UPLIGHT_TYPES.has(zone.type);
  const lightDistance = zone.size * S * 6;

  // ── Downlight spotlight types: cone beam from ceiling down ──
  if (isDownlight) {
    const coneHeight = mountHeight * 0.85;
    const coneRadius = Math.tan(spreadRad / 2) * coneHeight;

    return (
      <group position={[posX, 0, posZ]}>
        {/* Point light at mounting height for illumination */}
        <pointLight
          color={color}
          intensity={intensity * 1.5}
          distance={lightDistance}
          position={[0, mountHeight * 0.7, 0]}
          castShadow={castShadow}
          shadow-mapSize-width={castShadow ? 512 : undefined}
          shadow-mapSize-height={castShadow ? 512 : undefined}
        />

        {/* Visible cone beam geometry */}
        <mesh position={[0, mountHeight - coneHeight / 2, 0]}>
          <coneGeometry args={[coneRadius, coneHeight, 24, 1, true]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.04 + (zone.intensity / 100) * 0.06}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Fixture housing at mounting height */}
        <mesh position={[0, mountHeight, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 0.2, 8]} />
          <meshStandardMaterial color="#333" roughness={0.3} metalness={0.4} />
        </mesh>

        {/* Lens glow */}
        <mesh position={[0, mountHeight - 0.12, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>

        {/* Ground light pool */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[coneRadius * 1.1, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.08 + (zone.intensity / 100) * 0.12}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // ── Uplight types: glow cone upward + wall wash ──
  if (isUplight) {
    const coneHeight = mountHeight * 1.2;
    const coneRadius = Math.tan(spreadRad / 2) * coneHeight;

    return (
      <group position={[posX, 0, posZ]}>
        {/* Point light for illumination */}
        <pointLight
          color={color}
          intensity={intensity}
          distance={lightDistance}
          position={[0, mountHeight * 0.3, 0]}
          castShadow={castShadow}
          shadow-mapSize-width={castShadow ? 512 : undefined}
          shadow-mapSize-height={castShadow ? 512 : undefined}
        />

        {/* Fixture on ground */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.2, 10]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
        </mesh>

        {/* Colored lens cap */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.04, 10]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>

        {/* Upward glow cone */}
        <mesh position={[0, 0.2 + coneHeight / 2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[coneRadius, coneHeight, 24, 1, true]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.03 + (zone.intensity / 100) * 0.05}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Wall wash — vertical plane simulating light hitting a wall */}
        {/* Rendered as a semi-transparent disc tilted back at the spread angle */}
        <mesh
          position={[0, coneHeight * 0.6, 0]}
          rotation={[0, (zone.angle ?? 0) * Math.PI / 180, 0]}
        >
          <planeGeometry args={[coneRadius * 1.6, coneHeight * 0.8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.04 + (zone.intensity / 100) * 0.06}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Ground light pool (subtle) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[0.4, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.06 + (zone.intensity / 100) * 0.08}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // ── Other types (string lights, candles, etc.): point light + ground pool ──
  return (
    <group position={[posX, mountHeight, posZ]}>
      <pointLight
        color={color}
        intensity={intensity}
        distance={lightDistance}
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? 512 : undefined}
        shadow-mapSize-height={castShadow ? 512 : undefined}
      />
      {/* Fixture indicator */}
      <mesh>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      {/* Ground light pool */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -mountHeight + 0.01, 0]}>
        <circleGeometry args={[Math.tan(spreadRad / 2) * mountHeight * 0.5, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.06 + (zone.intensity / 100) * 0.08}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ── Main component ──

interface FloorPlan3DViewProps {
  floorPlanJSON: string | null;
  lightingZones: LightingZone[];
  lightingEnabled: boolean;
}

function FloorPlan3DScene({
  floorPlanJSON,
  lightingZones,
  lightingEnabled,
  centerX: cx,
  centerZ: cz,
  settings,
}: FloorPlan3DViewProps & { centerX: number; centerZ: number; settings: View3DSettings }) {
  const { objects, canvasWidth, canvasHeight } = useMemo(
    () => parseCanvasJSON(floorPlanJSON),
    [floorPlanJSON]
  );

  const originX = canvasWidth / 2;
  const originY = canvasHeight / 2;
  const maxDim = Math.max(canvasWidth, canvasHeight) * S;

  const rooms = useMemo(() => objects.filter((o) => o.type === "room"), [objects]);
  const furniture = useMemo(() => objects.filter((o) => o.type === "furniture"), [objects]);

  // Compute actual room bounding box so venue elements fit the room, not the canvas
  const roomBounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    let hasRoom = false;
    for (const room of rooms) {
      if (!room.points || room.points.length < 3) continue;
      hasRoom = true;
      for (const [px, py] of room.points) {
        const wx = (px - originX) * S;
        const wz = (py - originY) * S;
        minX = Math.min(minX, wx);
        maxX = Math.max(maxX, wx);
        minZ = Math.min(minZ, wz);
        maxZ = Math.max(maxZ, wz);
      }
    }
    if (!hasRoom) return { cx, cz, span: maxDim };
    const roomCx = (minX + maxX) / 2;
    const roomCz = (minZ + maxZ) / 2;
    const roomSpan = Math.max(maxX - minX, maxZ - minZ);
    return { cx: roomCx, cz: roomCz, span: roomSpan };
  }, [rooms, originX, originY, cx, cz, maxDim]);

  // Resolve venue preset
  const activePreset: VenuePresetDef | null = settings.venuePreset !== "none"
    ? VENUE_PRESETS[settings.venuePreset]
    : null;
  const effectiveFloor = activePreset?.floorOverride ?? FLOOR_MATERIALS[settings.floorMaterial];
  const fogColor = activePreset?.fogColor ?? "#f0ece6";
  const showWalls = activePreset?.showWalls ?? true;

  return (
    <>
      {/* Scene uses ambient + directional + hemisphere lighting instead of external HDR
         (Environment component fetches HDR from CDN which is blocked by CSP) */}

      {/* Fog for depth */}
      <fog attach="fog" args={[fogColor, maxDim * 2, maxDim * 5]} />

      {/* Scene lighting — mood-driven key + fill for dimension */}
      <ambientLight intensity={lightingEnabled ? LIGHTING_MOODS[settings.lightingMood].ambientIntensity * 0.4 : LIGHTING_MOODS[settings.lightingMood].ambientIntensity} color={LIGHTING_MOODS[settings.lightingMood].ambientColor} />
      {/* Key light — directional from upper-right */}
      <directionalLight
        position={[cx + maxDim * 0.4, maxDim * 0.6, cz + maxDim * 0.3]}
        intensity={lightingEnabled ? LIGHTING_MOODS[settings.lightingMood].keyIntensity * 0.4 : LIGHTING_MOODS[settings.lightingMood].keyIntensity}
        color={LIGHTING_MOODS[settings.lightingMood].keyColor}
        castShadow={settings.showShadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-maxDim}
        shadow-camera-right={maxDim}
        shadow-camera-top={maxDim}
        shadow-camera-bottom={-maxDim}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
      {/* Fill light — from opposite side */}
      <directionalLight
        position={[cx - maxDim * 0.3, maxDim * 0.4, cz - maxDim * 0.3]}
        intensity={LIGHTING_MOODS[settings.lightingMood].fillIntensity}
        color={LIGHTING_MOODS[settings.lightingMood].fillColor}
      />
      {/* Rim light for edge separation */}
      <directionalLight
        position={[cx, maxDim * 0.3, cz - maxDim * 0.5]}
        intensity={0.12}
        color="#f0ece6"
      />
      {/* Bounce light from below — simulates floor reflection */}
      <hemisphereLight
        args={["#faf7f0", "#d4c8b8", 0.15]}
      />

      {/* Ground plane (fallback if no room) — uses venue floor override when active */}
      {rooms.length === 0 && (
        <mesh key={`ground-${effectiveFloor.color}`} rotation={[-Math.PI / 2, 0, 0]} position={[roomBounds.cx, -0.01, roomBounds.cz]} receiveShadow>
          <planeGeometry args={[roomBounds.span * 1.5, roomBounds.span * 1.5]} />
          <meshStandardMaterial color={effectiveFloor.color} roughness={effectiveFloor.roughness} metalness={effectiveFloor.metalness} />
        </mesh>
      )}

      {/* Contact shadows — sized to room */}
      {settings.showShadows && (
        <ContactShadows
          position={[roomBounds.cx, -0.005, roomBounds.cz]}
          opacity={0.3}
          scale={roomBounds.span * 1.5}
          blur={3}
          far={roomBounds.span}
          resolution={512}
          color="#7a6e60"
        />
      )}

      {/* Venue environment elements (tent, grass, string lights, beams, etc.) — sized to room */}
      <VenueEnvironment preset={activePreset} cx={roomBounds.cx} cz={roomBounds.cz} maxDim={roomBounds.span} />

      {/* Room floor */}
      {rooms.map((room, i) => (
        <RoomFloor key={`room-${i}`} obj={room} originX={originX} originY={originY} settings={settings} showWalls={showWalls} floorOverride={activePreset?.floorOverride} />
      ))}

      {/* Furniture */}
      {furniture.map((obj, i) => (
        <FurnitureMesh key={`f-${i}`} obj={obj} originX={originX} originY={originY} settings={settings} />
      ))}

      {/* Lighting zones — cap shadow-casting to MAX_SHADOW_LIGHTS */}
      {lightingEnabled &&
        lightingZones.map((zone, i) => (
          <LightingZone3D
            key={zone.id}
            zone={zone}
            originX={originX}
            originY={originY}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            castShadow={i < MAX_SHADOW_LIGHTS}
          />
        ))}

      {/* Subtle ground grid — sized to room bounds */}
      <gridHelper
        args={[roomBounds.span * 1.5, Math.ceil(roomBounds.span * 1.5 / (20 * S)), "#ddd8d0", "#ebe6de"]}
        position={[roomBounds.cx, -0.004, roomBounds.cz]}
      />

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.08}
        target={[cx, 0, cz]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1}
        maxDistance={maxDim * 3}
      />
    </>
  );
}

function Settings3DPanel({
  settings,
  onChange,
  open,
  onToggle,
}: {
  settings: View3DSettings;
  onChange: (s: View3DSettings) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const update = <K extends keyof View3DSettings>(key: K, value: View3DSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const selectPreset = (preset: VenuePreset) => {
    const def = VENUE_PRESETS[preset];
    if (def) {
      onChange({
        ...settings,
        venuePreset: preset,
        floorMaterial: def.floorMaterial,
        lightingMood: def.lightingMood,
      });
    } else {
      onChange({ ...settings, venuePreset: preset });
    }
  };

  return (
    <div className="absolute top-3 right-3 z-10">
      {/* Gear toggle button */}
      <button
        onClick={onToggle}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
          open
            ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
            : "bg-white/90 text-stone-500 hover:text-stone-700 border border-stone-200 shadow-sm"
        }`}
        title="3D View Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>

      {/* Settings panel */}
      {open && (
        <div className="absolute top-11 right-0 w-64 max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-stone-200 p-4 space-y-4">
          <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">3D Settings</h3>

          {/* Venue Preset */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Venue</label>
            <div className="flex flex-wrap gap-1.5">
              {(["none", "indoor-ballroom", "tent", "outdoor-garden", "rooftop", "barn", "beach"] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => selectPreset(preset)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.venuePreset === preset
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {preset === "none" ? "Default" : (VENUE_PRESETS[preset]?.label ?? preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Chair Style */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Chair Style</label>
            <div className="flex flex-wrap gap-1.5">
              {(["solid-back", "chiavari", "folding", "ghost"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => update("chairStyle", style)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.chairStyle === style
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {style.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </button>
              ))}
            </div>
          </div>

          {/* Linen Color */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Linen Color</label>
            <div className="flex flex-wrap gap-1.5">
              {(["ivory", "white", "blush", "navy", "sage", "gold"] as const).map((color) => (
                <button
                  key={color}
                  onClick={() => update("linenColor", color)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
                    settings.linenColor === color
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-stone-300" style={{ backgroundColor: LINEN_COLORS[color] }} />
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Floor Material */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Floor</label>
            <div className="flex flex-wrap gap-1.5">
              {(["hardwood", "marble", "carpet", "concrete"] as const).map((mat) => (
                <button
                  key={mat}
                  onClick={() => update("floorMaterial", mat)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.floorMaterial === mat
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {mat.charAt(0).toUpperCase() + mat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Lighting Mood */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Lighting</label>
            <div className="flex flex-wrap gap-1.5">
              {(["warm", "cool", "neutral", "dramatic"] as const).map((mood) => (
                <button
                  key={mood}
                  onClick={() => update("lightingMood", mood)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.lightingMood === mood
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-100">
            <span className="text-xs text-stone-500">Labels</span>
            <button
              onClick={() => update("showLabels", !settings.showLabels)}
              className={`w-8 h-[18px] rounded-full transition-colors relative ${
                settings.showLabels ? "bg-indigo-500" : "bg-stone-300"
              }`}
            >
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                settings.showLabels ? "left-4" : "left-0.5"
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500">Shadows</span>
            <button
              onClick={() => update("showShadows", !settings.showShadows)}
              className={`w-8 h-[18px] rounded-full transition-colors relative ${
                settings.showShadows ? "bg-indigo-500" : "bg-stone-300"
              }`}
            >
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                settings.showShadows ? "left-4" : "left-0.5"
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FloorPlan3DView(props: FloorPlan3DViewProps) {
  const { floorPlanJSON } = props;
  const [settings, setSettings] = useState<View3DSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  // Compute camera position + centroid to frame the actual furniture
  const { camConfig, centerX, centerZ } = useMemo(() => {
    const parsed = parseCanvasJSON(floorPlanJSON);
    const originX = parsed.canvasWidth / 2;
    const originY = parsed.canvasHeight / 2;
    const allObjs = parsed.objects.filter((o) => o.type === "furniture" || o.type === "room");

    let span: number;
    let cX = 0;
    let cZ = 0;

    if (allObjs.length > 0) {
      // Compute bounding box of all visible objects in world coords
      let minWX = Infinity, maxWX = -Infinity, minWZ = Infinity, maxWZ = -Infinity;
      for (const obj of allObjs) {
        const hw = (obj.width || 40) / 2;
        const hh = (obj.height || 40) / 2;
        const wx = (obj.x - originX) * S;
        const wz = (obj.y - originY) * S;
        minWX = Math.min(minWX, wx - hw * S);
        maxWX = Math.max(maxWX, wx + hw * S);
        minWZ = Math.min(minWZ, wz - hh * S);
        maxWZ = Math.max(maxWZ, wz + hh * S);
      }
      span = Math.max(maxWX - minWX, maxWZ - minWZ);
      cX = (minWX + maxWX) / 2;
      cZ = (minWZ + maxWZ) / 2;
    } else {
      span = Math.max(parsed.canvasWidth, parsed.canvasHeight) * S;
    }

    // Camera distance: close enough to see furniture detail with room context
    const dist = Math.max(span * 0.75, 8);
    return {
      camConfig: {
        position: [cX + dist * 0.5, dist * 0.45, cZ + dist * 0.7] as [number, number, number],
        fov: 45,
        near: 0.1,
        far: 1000,
      },
      centerX: cX,
      centerZ: cZ,
    };
  }, [floorPlanJSON]);

  const handleCreated = useCallback((state: any) => {
    // Handle WebGL context loss gracefully
    const renderer = state.gl;
    const canvas = renderer.domElement;
    canvas.addEventListener("webglcontextlost", (e: Event) => {
      e.preventDefault();
    });
    canvas.addEventListener("webglcontextrestored", () => {
      // R3F will re-render automatically
    });
  }, []);

  // Clear color cache when the 3D view unmounts to free GPU-side references
  useEffect(() => {
    return () => {
      colorCache.clear();
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="w-full h-full bg-gradient-to-b from-stone-200 to-stone-300 relative">
        <Canvas
          shadows
          camera={camConfig}
          dpr={[1, 2]}
          onCreated={handleCreated}
          gl={{
            antialias: true,
            powerPreference: "default",
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
        >
          <Suspense fallback={null}>
            <FloorPlan3DScene {...props} centerX={centerX} centerZ={centerZ} settings={settings} />
          </Suspense>
        </Canvas>
        <Settings3DPanel
          settings={settings}
          onChange={setSettings}
          open={showSettings}
          onToggle={() => setShowSettings(!showSettings)}
        />
      </div>
    </ErrorBoundary>
  );
}
