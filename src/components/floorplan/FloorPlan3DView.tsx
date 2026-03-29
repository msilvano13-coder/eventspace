"use client";

import { useMemo, useCallback, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Environment, ContactShadows } from "@react-three/drei";
import { Color, Vector2, Shape, DoubleSide } from "three";
import { unwrapCanvasJSON } from "@/lib/floorplan-schema";
import { LightingZone } from "@/lib/types";
import { FURNITURE_CATALOG } from "@/lib/constants";
import { ErrorBoundary } from "./FloorPlan3DErrorBoundary";

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
          processObject(child, absX, absY, absAngle, ownScaleX, ownScaleY);
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
        });
      }
      return;
    }
    if (data.isGrid || data.isLighting || data.isLightingOverlay || data.isGuide) return;

    if (data.isRoom) {
      const points = obj.points || [];
      parsed.push({
        type: "room",
        furnitureId: "",
        label: "Room",
        shape: "rect",
        x: absX,
        y: absY,
        width: (obj.width || 0) * ownScaleX,
        height: (obj.height || 0) * ownScaleY,
        angle: absAngle,
        fill: "#faf7f0",
        stroke: "#a89070",
        points: points.map((p: any) => [p.x, p.y]),
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
function FurnitureLabel({ label, y }: { label: string; y: number }) {
  if (!label) return null;
  return (
    <Text
      position={[0, y, 0]}
      fontSize={0.25}
      color="#57534e"
      anchorX="center"
      anchorY="bottom"
      rotation={[-Math.PI / 4, 0, 0]}
    >
      {label}
    </Text>
  );
}

function FurnitureMesh({ obj, originX, originY }: { obj: ParsedObject; originX: number; originY: number }) {
  const h3d = getHeight(obj.furnitureId) * S;
  const pbr = getPBR(obj.furnitureId);

  // Convert 2D canvas position to 3D world position
  const posX = (obj.x - originX) * S;
  const posZ = (obj.y - originY) * S;
  const rotY = -(obj.angle * Math.PI) / 180;

  const fillColor = getCachedColor(obj.fill);
  const strokeColor = getCachedColor(obj.stroke);

  const category = getFurnitureCategory(obj.furnitureId);
  const w = obj.width * S;
  const d = obj.height * S;

  // ── Round tables ──
  if (category === "round-table") {
    const radius = (obj.radius || obj.width / 2) * S;
    const halfH = h3d / 2;
    return (
      <group position={[posX, halfH, posZ]} rotation={[0, rotY, 0]}>
        {/* Tabletop */}
        <mesh position={[0, halfH - 1 * S, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, 2 * S, 32]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Pedestal leg */}
        <mesh position={[0, -halfH / 2, 0]} castShadow>
          <cylinderGeometry args={[1.5 * S, 2 * S, h3d - 2 * S, 8]} />
          <meshStandardMaterial color={strokeColor} roughness={0.5} metalness={0.1} />
        </mesh>
        <FurnitureLabel label={obj.label} y={h3d + 2 * S} />
      </group>
    );
  }

  // ── Cocktail / high-top tables ──
  if (category === "cocktail-table") {
    const radius = (obj.radius || obj.width / 2) * S;
    const halfH = h3d / 2;
    return (
      <group position={[posX, halfH, posZ]} rotation={[0, rotY, 0]}>
        {/* Thin tabletop */}
        <mesh position={[0, halfH - 0.75 * S, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, 1.5 * S, 32]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Single center leg */}
        <mesh position={[0, -halfH / 2, 0]} castShadow>
          <cylinderGeometry args={[1 * S, 1.5 * S, h3d - 1.5 * S, 8]} />
          <meshStandardMaterial color={strokeColor} roughness={0.5} metalness={0.1} />
        </mesh>
        <FurnitureLabel label={obj.label} y={h3d + 2 * S} />
      </group>
    );
  }

  // ── Rectangular tables ──
  if (category === "rect-table") {
    const halfH = h3d / 2;
    const legPositions: [number, number, number][] = [
      [-w / 2 + 2 * S, 0, -d / 2 + 2 * S],
      [w / 2 - 2 * S, 0, -d / 2 + 2 * S],
      [-w / 2 + 2 * S, 0, d / 2 - 2 * S],
      [w / 2 - 2 * S, 0, d / 2 - 2 * S],
    ];
    return (
      <group position={[posX, halfH, posZ]} rotation={[0, rotY, 0]}>
        {/* Tabletop */}
        <mesh position={[0, halfH - 1 * S, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 2 * S, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* 4 legs */}
        {legPositions.map((pos, i) => (
          <mesh key={i} position={pos} castShadow>
            <boxGeometry args={[1.5 * S, h3d - 2 * S, 1.5 * S]} />
            <meshStandardMaterial color={strokeColor} roughness={0.5} metalness={0.1} />
          </mesh>
        ))}
        <FurnitureLabel label={obj.label} y={h3d + 2 * S} />
      </group>
    );
  }

  // ── Chairs ──
  if (category === "chair") {
    const seatH = 1.5 * S;
    const seatY = h3d * 0.5; // seat at roughly half total height
    const backH = 12 * S;
    const backThick = 1.5 * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Seat — solid cube */}
        <mesh position={[0, seatY, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, seatH, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Back panel — taller thin box behind the seat */}
        <mesh position={[0, seatY + backH / 2, -d / 2 + backThick / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, backH, backThick]} />
          <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <FurnitureLabel label={obj.label} y={seatY + backH + 2 * S} />
      </group>
    );
  }

  // ── Sofas ──
  if (category === "sofa") {
    const cushionH = 14 * S;
    const cushionD = d * 0.7;
    const backH = 20 * S;
    const backThick = 4 * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Cushion — low wide solid box */}
        <mesh position={[0, cushionH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, cushionH, cushionD]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Back — taller thinner box at rear */}
        <mesh position={[0, backH / 2, -cushionD / 2 + backThick / 2 - 1 * S]} castShadow receiveShadow>
          <boxGeometry args={[w, backH, backThick]} />
          <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <FurnitureLabel label={obj.label} y={backH + 2 * S} />
      </group>
    );
  }

  // ── Service counters (bar, buffet, dessert station, coffee station) ──
  if (category === "service-counter") {
    return (
      <group position={[posX, h3d / 2, posZ]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h3d, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <FurnitureLabel label={obj.label} y={h3d / 2 + 2 * S} />
      </group>
    );
  }

  // ── Flat surfaces (dance floor, aisle runner) ──
  if (category === "flat-surface") {
    return (
      <group position={[posX, 0.5 * S, posZ]} rotation={[0, rotY, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[w, 1 * S, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <FurnitureLabel label={obj.label} y={1 * S + 2 * S} />
      </group>
    );
  }

  // ── Stage — solid platform block ──
  if (category === "stage") {
    return (
      <group position={[posX, h3d / 2, posZ]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h3d, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <FurnitureLabel label={obj.label} y={h3d / 2 + 2 * S} />
      </group>
    );
  }

  // ── DJ Booth — solid console box ──
  if (category === "dj-booth") {
    return (
      <group position={[posX, h3d / 2, posZ]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h3d, d]} />
          <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <FurnitureLabel label={obj.label} y={h3d / 2 + 2 * S} />
      </group>
    );
  }

  // ── Photo Booth — frame structure: 4 tall corner posts + top frame ──
  if (category === "photo-booth") {
    const postRadius = 1.5 * S;
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
        <FurnitureLabel label={obj.label} y={postH + 2 * S} />
      </group>
    );
  }

  // ── Arch — two tall posts + crossbar at top ──
  if (category === "arch") {
    const postRadius = 2 * S;
    const postH = h3d;
    const crossH = 3 * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Left post */}
        <mesh position={[-w / 2 + postRadius, postH / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[postRadius, postRadius, postH, 8]} />
          <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Right post */}
        <mesh position={[w / 2 - postRadius, postH / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[postRadius, postRadius, postH, 8]} />
          <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Top crossbar */}
        <mesh position={[0, postH - crossH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, crossH, 3 * S]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <FurnitureLabel label={obj.label} y={postH + 2 * S} />
      </group>
    );
  }

  // ── Flower Arrangement — sphere on a short cylinder base ──
  if (category === "flower-arrangement") {
    const baseR = Math.min(w, d) / 2;
    const baseH = h3d * 0.4;
    const sphereR = baseR * 0.8;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Vase / base */}
        <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[baseR * 0.5, baseR * 0.7, baseH, 12]} />
          <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        {/* Flower sphere */}
        <mesh position={[0, baseH + sphereR, 0]} castShadow receiveShadow>
          <sphereGeometry args={[sphereR, 16, 16]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <FurnitureLabel label={obj.label} y={baseH + sphereR * 2 + 2 * S} />
      </group>
    );
  }

  // ── Draping — tall thin vertical panels ──
  if (category === "draping") {
    return (
      <group position={[posX, h3d / 2, posZ]} rotation={[0, rotY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h3d, 2 * S]} />
          <meshStandardMaterial
            color={fillColor}
            roughness={pbr.roughness}
            metalness={pbr.metalness}
            transparent
            opacity={0.85}
          />
        </mesh>
        <FurnitureLabel label={obj.label} y={h3d / 2 + 2 * S} />
      </group>
    );
  }

  // ── Uplighting — small cylinder on the ground ──
  if (category === "uplighting") {
    const lightR = Math.min(w, d) / 2;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        <mesh position={[0, h3d / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[lightR, lightR * 1.1, h3d, 12]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <FurnitureLabel label={obj.label} y={h3d + 2 * S} />
      </group>
    );
  }

  // ── Default fallback: original rect/circle rendering ──
  if (obj.shape === "circle") {
    const radius = (obj.radius || obj.width / 2) * S;
    const halfH = h3d / 2;
    return (
      <group position={[posX, halfH, posZ]} rotation={[0, rotY, 0]}>
        <mesh position={[0, halfH - 1 * S, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, 2 * S, 32]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
        </mesh>
        <mesh position={[0, -halfH / 2, 0]} castShadow>
          <cylinderGeometry args={[1.5 * S, 2 * S, h3d - 2 * S, 8]} />
          <meshStandardMaterial color={strokeColor} roughness={0.5} metalness={0.1} />
        </mesh>
        <FurnitureLabel label={obj.label} y={h3d + 2 * S} />
      </group>
    );
  }

  // Default rectangular fallback
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

  const legPositions: [number, number, number][] = [
    [-w / 2 + 2 * S, 0, -d / 2 + 2 * S],
    [w / 2 - 2 * S, 0, -d / 2 + 2 * S],
    [-w / 2 + 2 * S, 0, d / 2 - 2 * S],
    [w / 2 - 2 * S, 0, d / 2 - 2 * S],
  ];

  return (
    <group position={[posX, halfH, posZ]} rotation={[0, rotY, 0]}>
      <mesh position={[0, halfH - 1 * S, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 2 * S, d]} />
        <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} />
      </mesh>
      {legPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[1.5 * S, h3d - 2 * S, 1.5 * S]} />
          <meshStandardMaterial color={strokeColor} roughness={0.5} metalness={0.1} />
        </mesh>
      ))}
      <FurnitureLabel label={obj.label} y={h3d + 2 * S} />
    </group>
  );
}

function RoomFloor({ obj, originX, originY }: { obj: ParsedObject; originX: number; originY: number }) {
  // Memoize shape to avoid re-creating on every render
  const floorShape = useMemo(() => {
    if (!obj.points || obj.points.length < 3) return null;
    // Negate Y because the Shape (XY plane) is rotated -π/2 around X,
    // mapping Shape Y → World -Z.  Furniture uses posZ = +(canvasY - originY),
    // so we negate here to keep room floor and furniture in the same Z direction.
    const shapePoints = obj.points.map(
      ([x, y]) => new Vector2((x + obj.x - originX) * S, -(y + obj.y - originY) * S)
    );
    return new Shape(shapePoints);
  }, [obj.points, obj.x, obj.y, originX, originY]);

  // Compute wall segments from polygon edges in world space.
  // Walls are placed directly in world coords (not via Shape rotation),
  // so Z uses the same sign as furniture: +(canvasY - originY) * S.
  const wallSegments = useMemo(() => {
    if (!obj.points || obj.points.length < 3) return [];
    const segments: { x1: number; z1: number; x2: number; z2: number; length: number; angle: number; cx: number; cz: number }[] = [];
    const pts = obj.points.map(([x, y]) => ({
      x: (x + obj.x - originX) * S,
      z: (y + obj.y - originY) * S,
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
  }, [obj.points, obj.x, obj.y, originX, originY]);

  if (!floorShape) return null;

  const wallThickness = 0.15;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <extrudeGeometry args={[floorShape, { depth: 0.02, bevelEnabled: false }]} />
        <meshStandardMaterial color="#faf7f0" side={DoubleSide} roughness={0.85} metalness={0} />
      </mesh>
      {/* Walls — slightly transparent so interior is visible */}
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
            color="#e8e4dc"
            roughness={0.9}
            metalness={0}
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Max shadow-casting point lights to protect GPU */
const MAX_SHADOW_LIGHTS = 4;

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

  return (
    <group position={[posX, 5, posZ]}>
      <pointLight
        color={color}
        intensity={intensity}
        distance={zone.size * S * 6}
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? 512 : undefined}
        shadow-mapSize-height={castShadow ? 512 : undefined}
      />
      <mesh>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
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
}: FloorPlan3DViewProps & { centerX: number; centerZ: number }) {
  const { objects, canvasWidth, canvasHeight } = useMemo(
    () => parseCanvasJSON(floorPlanJSON),
    [floorPlanJSON]
  );

  const originX = canvasWidth / 2;
  const originY = canvasHeight / 2;
  const maxDim = Math.max(canvasWidth, canvasHeight) * S;

  const rooms = useMemo(() => objects.filter((o) => o.type === "room"), [objects]);
  const furniture = useMemo(() => objects.filter((o) => o.type === "furniture"), [objects]);

  return (
    <>
      {/* Environment map for realistic reflections */}
      <Environment preset="apartment" background={false} />

      {/* Fog for depth */}
      <fog attach="fog" args={["#e7e5e4", maxDim * 1.5, maxDim * 4]} />

      {/* Scene lighting */}
      <ambientLight intensity={lightingEnabled ? 0.15 : 0.4} />
      <directionalLight
        position={[cx + 10, 20, cz + 10]}
        intensity={lightingEnabled ? 0.3 : 0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-maxDim}
        shadow-camera-right={maxDim}
        shadow-camera-top={maxDim}
        shadow-camera-bottom={-maxDim}
        shadow-bias={-0.0001}
      />
      {/* Fill light from opposite side */}
      <directionalLight position={[cx - 8, 12, cz - 8]} intensity={0.15} />
      {/* Rim light for edge definition */}
      <directionalLight position={[cx, 8, cz - 15]} intensity={0.1} />

      {/* Ground plane (fallback if no room) */}
      {rooms.length === 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, cz]} receiveShadow>
          <planeGeometry args={[maxDim * 1.5, maxDim * 1.5]} />
          <meshStandardMaterial color="#e7e5e4" roughness={0.9} metalness={0} />
        </mesh>
      )}

      {/* Contact shadows for soft ground shadows */}
      <ContactShadows
        position={[cx, -0.005, cz]}
        opacity={0.35}
        scale={maxDim * 1.5}
        blur={2.5}
        far={maxDim}
        resolution={512}
        color="#8a7a6a"
      />

      {/* Room floor */}
      {rooms.map((room, i) => (
        <RoomFloor key={`room-${i}`} obj={room} originX={originX} originY={originY} />
      ))}

      {/* Furniture */}
      {furniture.map((obj, i) => (
        <FurnitureMesh key={`f-${i}`} obj={obj} originX={originX} originY={originY} />
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

      {/* Grid on the ground — centered on furniture */}
      <gridHelper
        args={[maxDim * 1.5, Math.ceil(maxDim * 1.5 / (20 * S)), "#d6d3d1", "#e7e5e4"]}
        position={[cx, -0.005, cz]}
      />

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        target={[cx, 0, cz]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1}
        maxDistance={maxDim * 3}
      />
    </>
  );
}

export default function FloorPlan3DView(props: FloorPlan3DViewProps) {
  const { floorPlanJSON } = props;

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
      <div className="w-full h-full bg-gradient-to-b from-stone-200 to-stone-300">
        <Canvas
          shadows
          camera={camConfig}
          dpr={[1, 2]}
          onCreated={handleCreated}
          gl={{ antialias: true, powerPreference: "default" }}
        >
          <Suspense fallback={null}>
            <FloorPlan3DScene {...props} centerX={centerX} centerZ={centerZ} />
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}
