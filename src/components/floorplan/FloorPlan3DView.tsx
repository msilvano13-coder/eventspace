"use client";

import { useMemo, useCallback, Suspense } from "react";
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

// ── Color cache (avoid allocating THREE.Color on every render) ──
const colorCache = new Map<string, Color>();
function getCachedColor(hex: string): Color {
  let c = colorCache.get(hex);
  if (!c) {
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

  for (const obj of fabricObjects) {
    const data = obj.data;
    if (!data) continue;
    if (data.isGrid || data.isLighting || data.isLightingOverlay || data.isGuide) continue;

    if (data.isRoom) {
      const points = obj.points || [];
      parsed.push({
        type: "room",
        furnitureId: "",
        label: "Room",
        shape: "rect",
        x: obj.left || 0,
        y: obj.top || 0,
        width: obj.width || 0,
        height: obj.height || 0,
        angle: obj.angle || 0,
        fill: "#faf7f0",
        stroke: "#a89070",
        points: points.map((p: any) => [p.x, p.y]),
      });
      continue;
    }

    if (data.furnitureId) {
      const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
      const shape = catalogItem?.shape || "rect";
      const w = obj.width || catalogItem?.defaultWidth || 40;
      const h = obj.height || catalogItem?.defaultHeight || 40;
      const r = catalogItem?.defaultRadius;

      parsed.push({
        type: "furniture",
        furnitureId: data.furnitureId,
        label: data.label || data.furnitureId,
        shape,
        x: obj.left || 0,
        y: obj.top || 0,
        width: w,
        height: h,
        radius: r,
        angle: obj.angle || 0,
        fill: catalogItem?.fill || obj.fill || "#f5f0e8",
        stroke: catalogItem?.stroke || obj.stroke || "#c4b5a0",
      });
    }
  }

  return {
    objects: parsed,
    canvasWidth: (canvasJSON as any).width || 800,
    canvasHeight: (canvasJSON as any).height || 600,
  };
}

// ── 3D Components ──

/** Scale factor: convert canvas px (inches) to 3D world units */
const SCALE = 1 / 24; // 1 inch = 1/24 world unit (so a 60" table = 2.5 units)
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
        <sphereGeometry args={[0.06, 12, 12]} />
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

  // Compute camera position from data
  const camConfig = useMemo(() => {
    const parsed = parseCanvasJSON(floorPlanJSON);
    const maxDim = Math.max(parsed.canvasWidth, parsed.canvasHeight) * S;
    const dist = maxDim * 0.8;
    return {
      position: [dist * 0.6, dist * 0.8, dist * 0.6] as [number, number, number],
      fov: 50,
      near: 0.1,
      far: 500,
    };
  }, [floorPlanJSON]);

  const handleCreated = useCallback((state: any) => {
    // Handle WebGL context loss gracefully
    const renderer = state.gl;
    const canvas = renderer.domElement;
    canvas.addEventListener("webglcontextlost", (e: Event) => {
      e.preventDefault();
    });
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
