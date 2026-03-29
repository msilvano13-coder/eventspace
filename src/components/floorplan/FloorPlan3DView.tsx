"use client";

import { useMemo, useCallback, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
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
  return FURNITURE_HEIGHTS[furnitureId] ?? 30;
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

  function processObject(obj: any, parentX = 0, parentY = 0, parentAngle = 0) {
    const data = obj.data;
    const absX = parentX + (obj.left || 0);
    const absY = parentY + (obj.top || 0);
    const absAngle = parentAngle + (obj.angle || 0);

    // Table set groups or plain groups: recurse into children
    // Fabric.js v6 serializes type as "Group" (capital G)
    const objType = (obj.type || "").toLowerCase();
    if (objType === "group" && Array.isArray(obj.objects)) {
      // If this is a table set, recurse into sub-objects to render each piece
      if (data?.isTableSet) {
        for (const child of obj.objects) {
          processObject(child, absX, absY, absAngle);
        }
        return;
      }

      // Individual furniture item (group = shape + label) — has furnitureId
      if (data?.furnitureId) {
        const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
        const shape = catalogItem?.shape || "rect";
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        const w = (obj.width || catalogItem?.defaultWidth || 40) * scaleX;
        const h = (obj.height || catalogItem?.defaultHeight || 40) * scaleY;
        const r = catalogItem?.defaultRadius ? catalogItem.defaultRadius * scaleX : undefined;

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
        processObject(child, absX, absY, absAngle);
      }
      return;
    }

    // Bare shape (no data) inside a table set group — infer as chair or table from shape properties
    if (!data) {
      const shapeType = (obj.type || "").toLowerCase();
      if (shapeType === "circle" || shapeType === "rect" || shapeType === "rectangle") {
        const scaleX = obj.scaleX || 1;
        const scaleY = obj.scaleY || 1;
        const w = (obj.width || 20) * scaleX;
        const h = (obj.height || 20) * scaleY;
        const r = obj.radius ? obj.radius * scaleX : undefined;
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
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1),
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
      const scaleX = obj.scaleX || 1;
      const scaleY = obj.scaleY || 1;
      const w = (obj.width || catalogItem?.defaultWidth || 40) * scaleX;
      const h = (obj.height || catalogItem?.defaultHeight || 40) * scaleY;
      const r = catalogItem?.defaultRadius ? catalogItem.defaultRadius * scaleX : undefined;

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

function FurnitureMesh({ obj, originX, originY }: { obj: ParsedObject; originX: number; originY: number }) {
  const h3d = getHeight(obj.furnitureId) * S;
  const halfH = h3d / 2;

  // Convert 2D canvas position to 3D world position
  const posX = (obj.x - originX) * S;
  const posZ = (obj.y - originY) * S;
  const rotY = -(obj.angle * Math.PI) / 180;

  const fillColor = getCachedColor(obj.fill);
  const strokeColor = getCachedColor(obj.stroke);

  if (obj.shape === "circle") {
    const radius = (obj.radius || obj.width / 2) * S;
    return (
      <group position={[posX, halfH, posZ]} rotation={[0, rotY, 0]}>
        <mesh position={[0, halfH - 1 * S, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, 2 * S, 32]} />
          <meshStandardMaterial color={fillColor} />
        </mesh>
        <mesh position={[0, -halfH / 2, 0]} castShadow>
          <cylinderGeometry args={[1.5 * S, 2 * S, h3d - 2 * S, 8]} />
          <meshStandardMaterial color={strokeColor} />
        </mesh>
        <Text
          position={[0, h3d + 2 * S, 0]}
          fontSize={0.25}
          color="#57534e"
          anchorX="center"
          anchorY="bottom"
          rotation={[-Math.PI / 4, 0, 0]}
        >
          {obj.label}
        </Text>
      </group>
    );
  }

  // Rectangular furniture
  const w = obj.width * S;
  const d = obj.height * S;

  // Special flat items (dance floor, aisle runner)
  if (h3d < 2 * S) {
    return (
      <group position={[posX, 0.5 * S, posZ]} rotation={[0, rotY, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[w, 1 * S, d]} />
          <meshStandardMaterial color={fillColor} />
        </mesh>
      </group>
    );
  }

  // Leg positions — computed once per render (stable for same obj)
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
        <meshStandardMaterial color={fillColor} />
      </mesh>
      {legPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[1.5 * S, h3d - 2 * S, 1.5 * S]} />
          <meshStandardMaterial color={strokeColor} />
        </mesh>
      ))}
      <Text
        position={[0, h3d + 2 * S, 0]}
        fontSize={0.12}
        color="#57534e"
        anchorX="center"
        anchorY="bottom"
        rotation={[-Math.PI / 4, 0, 0]}
      >
        {obj.label}
      </Text>
    </group>
  );
}

function RoomFloor({ obj, originX, originY }: { obj: ParsedObject; originX: number; originY: number }) {
  // Memoize shape to avoid re-creating on every render
  const floorShape = useMemo(() => {
    if (!obj.points || obj.points.length < 3) return null;
    const shapePoints = obj.points.map(
      ([x, y]) => new Vector2((x + obj.x - originX) * S, (y + obj.y - originY) * S)
    );
    return new Shape(shapePoints);
  }, [obj.points, obj.x, obj.y, originX, originY]);

  if (!floorShape) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <extrudeGeometry args={[floorShape, { depth: 0.02, bevelEnabled: false }]} />
      <meshStandardMaterial color="#faf7f0" side={DoubleSide} />
    </mesh>
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
}: FloorPlan3DViewProps) {
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
      {/* Scene lighting */}
      <ambientLight intensity={lightingEnabled ? 0.15 : 0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={lightingEnabled ? 0.3 : 1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-maxDim}
        shadow-camera-right={maxDim}
        shadow-camera-top={maxDim}
        shadow-camera-bottom={-maxDim}
      />
      {/* Fill light from opposite side */}
      <directionalLight position={[-8, 12, -8]} intensity={0.2} />

      {/* Ground plane (fallback if no room) */}
      {rooms.length === 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[maxDim * 1.5, maxDim * 1.5]} />
          <meshStandardMaterial color="#e7e5e4" />
        </mesh>
      )}

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

      {/* Grid on the ground */}
      <gridHelper
        args={[maxDim * 1.5, Math.ceil(maxDim * 1.5 / (20 * S)), "#d6d3d1", "#e7e5e4"]}
        position={[0, -0.005, 0]}
      />

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1}
        maxDistance={maxDim * 3}
      />
    </>
  );
}

export default function FloorPlan3DView(props: FloorPlan3DViewProps) {
  const { floorPlanJSON } = props;

  // Compute camera position to frame the actual furniture, not the full canvas
  const camConfig = useMemo(() => {
    const parsed = parseCanvasJSON(floorPlanJSON);
    const furniture = parsed.objects.filter((o) => o.type === "furniture");
    let span: number;
    if (furniture.length > 0) {
      // Compute bounding box of all furniture
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const obj of furniture) {
        const hw = (obj.width || 40) / 2;
        const hh = (obj.height || 40) / 2;
        minX = Math.min(minX, obj.x - hw);
        maxX = Math.max(maxX, obj.x + hw);
        minY = Math.min(minY, obj.y - hh);
        maxY = Math.max(maxY, obj.y + hh);
      }
      span = Math.max(maxX - minX, maxY - minY) * S;
    } else {
      span = Math.max(parsed.canvasWidth, parsed.canvasHeight) * S;
    }
    // Camera distance: far enough to see all furniture with some padding
    const dist = Math.max(span * 0.9, 8);
    return {
      position: [dist * 0.6, dist * 0.7, dist * 0.6] as [number, number, number],
      fov: 50,
      near: 0.1,
      far: 1000,
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
          dpr={[1, 1.5]}
          onCreated={handleCreated}
          gl={{ antialias: true, powerPreference: "default" }}
        >
          <Suspense fallback={null}>
            <FloorPlan3DScene {...props} />
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}
