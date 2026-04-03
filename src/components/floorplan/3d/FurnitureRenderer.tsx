"use client";

import React, { useMemo, useEffect, useState, useRef, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { DoubleSide } from "three";
import { useGLTF } from "@react-three/drei";
import { Tablescape } from "@/lib/types";
import {
  S,
  H_MULT,
  METERS_TO_FLOORPLAN,
  TABLESCAPE_CATEGORY_SIZE,
  LINEN_COLORS,
  getHeight,
  getPBR,
  getFurnitureCategory,
  getCachedColor,
  adjustBrightness,
  type ParsedObject,
  type View3DSettings,
} from "./constants";

// ── Label texture cache ──

export const labelTextureCache = new Map<string, THREE.CanvasTexture>();

/** Label that floats above every furniture piece — uses canvas-texture sprite to avoid CSP/worker issues */
function FurnitureLabel({ label, y }: { label: string; y: number }) {
  const texture = useMemo(() => {
    if (!label) return null;
    const cached = labelTextureCache.get(label);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const fontSize = 28;
    const padding = 8;
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const metrics = ctx.measureText(label);
    const textWidth = metrics.width;

    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    // Background
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 6);
    ctx.fill();

    // Text
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = "#4a4540";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    labelTextureCache.set(label, tex);
    return tex;
  }, [label]);

  if (!texture) return null;

  const aspect = texture.image.width / texture.image.height;
  const spriteHeight = 0.18;
  const spriteWidth = spriteHeight * aspect;

  return (
    <sprite position={[0, y + 0.2, 0]} scale={[spriteWidth, spriteHeight, 1]}>
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
}

/** Wrapper that adds hover highlight to all child meshes via emissive boost */
export function InteractiveFurniture({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!groupRef.current || !enabled) return;
    groupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material;
        if (mat && "emissiveIntensity" in mat && !("userData" in mat && (mat as any).userData?.isGlow)) {
          const target = hovered ? 0.15 : 0;
          const current = (mat as THREE.MeshStandardMaterial).emissiveIntensity;
          (mat as THREE.MeshStandardMaterial).emissiveIntensity = current + (target - current) * 0.15;
          if (hovered && (mat as THREE.MeshStandardMaterial).emissive.r === 0 && (mat as THREE.MeshStandardMaterial).emissive.g === 0 && (mat as THREE.MeshStandardMaterial).emissive.b === 0) {
            (mat as THREE.MeshStandardMaterial).emissive.setHex(0x8090ff);
          }
          if (!hovered && current < 0.01) {
            (mat as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
        }
      }
    });
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={enabled ? (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={enabled ? () => { setHovered(false); document.body.style.cursor = "auto"; } : undefined}
    >
      {children}
    </group>
  );
}

// ── Tablescape items rendered on a table in 3D ──

function TablescapeGLBItemInner({ item, asset }: { item: { positionX: number; positionY: number; positionZ: number; rotationY: number; scale: number }; asset: { category: string; filePath: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_MODELS_CDN_URL || "/models";
  const url = `${baseUrl}/${asset.filePath}`;
  const { scene } = useGLTF(url);
  const autoScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return 1;
    const target = TABLESCAPE_CATEGORY_SIZE[asset.category] ?? 0.25;
    return target / maxDim;
  }, [scene, asset.category]);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return (
    <group
      position={[item.positionX, item.positionY, item.positionZ]}
      rotation={[0, item.rotationY, 0]}
      scale={autoScale * item.scale}
    >
      <primitive object={cloned} />
    </group>
  );
}

/** Per-item error boundary so a single missing GLB doesn't kill the entire 3D view */
class TablescapeItemErrorBoundary extends React.Component<
  { children: React.ReactNode; assetId: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; assetId: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn(`[3D] Skipping tablescape item "${this.props.assetId}": ${error.message}`);
  }
  render() {
    if (this.state.hasError) return null; // silently skip missing model
    return this.props.children;
  }
}

function TablescapeGLBItem({ item, manifest }: { item: { assetId: string; positionX: number; positionY: number; positionZ: number; rotationY: number; scale: number }; manifest: Record<string, { category: string; filePath: string }> }) {
  const asset = manifest[item.assetId];
  if (!asset) return null;
  return (
    <TablescapeItemErrorBoundary assetId={item.assetId}>
      <TablescapeGLBItemInner item={item} asset={asset} />
    </TablescapeItemErrorBoundary>
  );
}

/**
 * Render tablescape items on a table in the floorplan 3D view.
 *
 * Coordinate system conversion:
 * - Tablescape editor works in meters (INCHES_TO_METERS = 0.0254)
 * - FloorPlan 3D uses S = 1/12 (1 inch = 1/12 unit, so 1 foot = 1 unit)
 * - Conversion: meters -> floorplan units = 1 / 0.3048 ~ 3.2808 (meters to feet)
 */
function TablescapeItems3D({ tablescape, tableTopY }: { tablescape: Tablescape; tableTopY: number }) {
  const [manifest, setManifest] = useState<Record<string, { category: string; filePath: string }> | null>(null);

  useEffect(() => {
    fetch("/models-manifest.json")
      .then((r) => r.json())
      .then((data) => setManifest(data.models))
      .catch(() => {});
  }, []);

  if (!manifest || tablescape.items.length === 0) return null;

  return (
    <group position={[0, tableTopY, 0]} scale={METERS_TO_FLOORPLAN}>
      {tablescape.items.map((item) => (
        <Suspense key={item.id} fallback={null}>
          <TablescapeGLBItem
            item={{ ...item, positionY: item.positionY - 0.78 }}
            manifest={manifest}
          />
        </Suspense>
      ))}
    </group>
  );
}

// ── Main FurnitureMesh component ──

export function FurnitureMesh({ obj, originX, originY, settings, tablescapes }: { obj: ParsedObject; originX: number; originY: number; settings: View3DSettings; tablescapes?: Tablescape[] }) {
  const h3d = getHeight(obj.furnitureId) * S;
  const pbr = getPBR(obj.furnitureId);

  // Convert 2D canvas position to 3D world position
  const posX = (obj.x - originX) * S;
  const posZ = (obj.y - originY) * S;
  // Table-set chairs have pre-set angles facing the table center — compensate
  // for the flipped back panel by adding pi so they face inward again
  const category = getFurnitureCategory(obj.furnitureId);
  // For table-set chairs, compute rotation so the chair back faces away from the table center
  // (person sits facing the table, chair back faces outward)
  let rotY = -(obj.angle * Math.PI) / 180;
  if (category === "chair" && obj.inTableSet && obj.tableCenter) {
    // Direction from table center to chair (the "away" direction) in canvas coords
    // Canvas X -> 3D X (same), Canvas Y -> 3D Z (same)
    // Chair back is local +Z; Y-rotation theta maps local +Z to world (sin theta, cos theta) in XZ
    const awayX = obj.x - obj.tableCenter.x;
    const awayZ = obj.y - obj.tableCenter.y;
    rotY = Math.atan2(awayX, awayZ);
  }

  // Override 2D diagram colors with realistic 3D material colors.
  // The 2D canvas uses bright category-coded colors (pink, yellow, indigo) for readability;
  // in 3D these need to look like real materials.
  const REALISTIC_3D_COLORS: Record<string, { fill: string; stroke: string }> = {
    "bar": { fill: "#5c4033", stroke: "#3a2820" },            // dark walnut body, espresso countertop
    "buffet": { fill: "#f5f0e8", stroke: "#8b7355" },         // white linen skirting, wood trim
    "dessert-station": { fill: "#f5f0e8", stroke: "#8b7355" },
    "coffee-station": { fill: "#f5f0e8", stroke: "#5c4033" },
    "photo-booth": { fill: "#2a2a2a", stroke: "#1a1a1a" },    // matte black frame
    "draping": { fill: "#f0ebe4", stroke: "#d5cfc6" },        // ivory sheer fabric
    "stage": { fill: "#2c2420", stroke: "#1a1510" },           // dark stained platform
    "dj-booth": { fill: "#1e1e1e", stroke: "#111111" },        // black DJ equipment
    "restrooms": { fill: "#e8e4e0", stroke: "#9a9590" },       // neutral gray walls
    "flower-arrangement": { fill: "#e8d5d0", stroke: "#c4978a" }, // soft blush/rose tones
    "arch": { fill: "#d4c8b8", stroke: "#a89880" },            // natural wood/greenery
    "uplighting": { fill: "#f5ecd0", stroke: "#c4a040" },      // warm amber fixture
  };
  const colorOverride = REALISTIC_3D_COLORS[obj.furnitureId];
  const fillColor = getCachedColor(colorOverride?.fill ?? obj.fill);
  const strokeColor = getCachedColor(colorOverride?.stroke ?? obj.stroke);
  const linenColor = getCachedColor(settings.linenCustomColor ?? LINEN_COLORS[settings.linenColor]);
  const woodColor = getCachedColor("#8b7355");      // medium wood brown for table legs
  // Chair colors: use custom color if set, otherwise default gold/wood tones
  const chairGold = getCachedColor(settings.chairColor ?? "#c4a46c");
  const chairBack = getCachedColor(settings.chairColor ? adjustBrightness(settings.chairColor, -0.15) : "#a8905a");
  const chairLeg = getCachedColor(settings.chairColor ? adjustBrightness(settings.chairColor, -0.2) : "#9a8050");
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
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} envMapIntensity={0.05} />
        </mesh>
        {/* Tablecloth top disc */}
        <mesh position={[0, tableTopY + topThick / 2 + 0.01, 0]} receiveShadow>
          <cylinderGeometry args={[clothRadius, clothRadius, 0.05, 32]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} envMapIntensity={0.05} />
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
              <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} envMapIntensity={0.05} />
            </mesh>
          );
        })}
        {/* Centerpiece or tablescape items */}
        {obj.tablescapeId && tablescapes && tablescapes.find((t) => t.id === obj.tablescapeId) ? (
          <TablescapeItems3D
            tablescape={tablescapes.find((t) => t.id === obj.tablescapeId)!}
            tableTopY={tableTopY + topThick / 2}
          />
        ) : (
          <>
            <mesh position={[0, tableTopY + topThick / 2 + 2 * S, 0]} castShadow>
              <cylinderGeometry args={[0.8 * S, 1.2 * S, 4 * S, 8]} />
              <meshStandardMaterial color={strokeColor} roughness={0.3} metalness={0.15} />
            </mesh>
            <mesh position={[0, tableTopY + topThick / 2 + 5 * S, 0]} castShadow>
              <sphereGeometry args={[1.5 * S, 8, 8]} />
              <meshStandardMaterial color={fillColor} roughness={0.7} metalness={0} />
            </mesh>
          </>
        )}
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
        {/* Table top — thin, polished with clearcoat */}
        <mesh position={[0, tableTopY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, 1 * S, 32]} />
          <meshPhysicalMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} clearcoat={pbr.clearcoat ?? 0} clearcoatRoughness={pbr.clearcoatRoughness ?? 0} />
        </mesh>
        {/* Optional small cloth/topper */}
        <mesh position={[0, tableTopY + 0.55 * S, 0]} receiveShadow>
          <cylinderGeometry args={[radius * 0.85, radius * 0.85, 0.1, 32]} />
          <meshStandardMaterial color={linenColor} roughness={0.9} metalness={0} envMapIntensity={0.05} />
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
        {/* Table surface — beveled edges */}
        <RoundedBox args={[w, topThick, d]} radius={0.03} smoothness={4} position={[0, tableTopY - topThick / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
        </RoundedBox>
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
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} envMapIntensity={0.05} />
        </mesh>
        {/* Linen drape — front */}
        <mesh position={[0, tableTopY - clothDrop / 2, d / 2 + clothOverhang]} receiveShadow>
          <boxGeometry args={[w + clothOverhang * 2, clothDrop, 0.08]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} envMapIntensity={0.05} />
        </mesh>
        {/* Linen drape — back */}
        <mesh position={[0, tableTopY - clothDrop / 2, -d / 2 - clothOverhang]} receiveShadow>
          <boxGeometry args={[w + clothOverhang * 2, clothDrop, 0.08]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} envMapIntensity={0.05} />
        </mesh>
        {/* Linen drape — left */}
        <mesh position={[-w / 2 - clothOverhang, tableTopY - clothDrop / 2, 0]} receiveShadow>
          <boxGeometry args={[0.08, clothDrop, d + clothOverhang * 2]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} envMapIntensity={0.05} />
        </mesh>
        {/* Linen drape — right */}
        <mesh position={[w / 2 + clothOverhang, tableTopY - clothDrop / 2, 0]} receiveShadow>
          <boxGeometry args={[0.08, clothDrop, d + clothOverhang * 2]} />
          <meshStandardMaterial color={linenColor} roughness={0.92} metalness={0} envMapIntensity={0.05} />
        </mesh>
        {/* Centerpiece or tablescape items */}
        {obj.tablescapeId && tablescapes && tablescapes.find((t) => t.id === obj.tablescapeId) ? (
          <TablescapeItems3D
            tablescape={tablescapes.find((t) => t.id === obj.tablescapeId)!}
            tableTopY={tableTopY}
          />
        ) : null}
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
    const legR = 1.0 * S;
    const legInset = 1.8 * S;
    const backThick = 1.2 * S;
    return (
      <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
        {/* Legs — style-dependent */}
        {settings.chairStyle === "ghost" ? (
          /* Ghost chair — transparent acrylic legs */
          ([
            [-w / 2 + legInset, -d / 2 + legInset],
            [w / 2 - legInset, -d / 2 + legInset],
            [-w / 2 + legInset, d / 2 - legInset],
            [w / 2 - legInset, d / 2 - legInset],
          ] as [number, number][]).map(([lx, lz], i) => (
            <mesh key={`leg-${i}`} position={[lx, seatY / 2, lz]}>
              <cylinderGeometry args={[legR * 0.7, legR * 0.85, seatY, 8]} />
              <meshPhysicalMaterial color="#e8f0f8" roughness={0.05} metalness={0} transmission={0.85} thickness={0.5} ior={1.5} transparent opacity={0.5} />
            </mesh>
          ))
        ) : (
          ([
            [-w / 2 + legInset, -d / 2 + legInset],
            [w / 2 - legInset, -d / 2 + legInset],
            [-w / 2 + legInset, d / 2 - legInset],
            [w / 2 - legInset, d / 2 - legInset],
          ] as [number, number][]).map(([lx, lz], i) => (
            <mesh key={`leg-${i}`} position={[lx, seatY / 2, lz]} castShadow={settings.showShadows}>
              <cylinderGeometry args={[settings.chairStyle === "folding" ? legR * 0.6 : legR * 0.8, legR, seatY, 8]} />
              <meshStandardMaterial color={chairLeg} roughness={0.45} metalness={0.1} />
            </mesh>
          ))
        )}
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
        {/* Seat — rounded edges for polish */}
        <RoundedBox args={[w, settings.chairStyle === "folding" ? seatThick * 0.6 : seatThick, d]} radius={0.015} smoothness={3} position={[0, seatY, 0]} castShadow={settings.showShadows} receiveShadow>
          {settings.chairStyle === "ghost" ? (
            <meshPhysicalMaterial color="#e8f0f8" roughness={0.05} metalness={0} transmission={0.85} thickness={0.8} ior={1.5} transparent opacity={0.5} />
          ) : (
            <meshStandardMaterial color={chairGold} roughness={0.6} metalness={0.08} />
          )}
        </RoundedBox>
        {/* Chair back — style depends on settings */}
        {settings.chairStyle === "solid-back" && (
          <mesh position={[0, seatY + backH / 2 + seatThick / 2, d / 2 - backThick / 2]} castShadow={settings.showShadows} receiveShadow>
            <boxGeometry args={[w, backH, backThick]} />
            <meshStandardMaterial color={chairBack} roughness={0.5} metalness={0.06} />
          </mesh>
        )}
        {settings.chairStyle === "chiavari" && (
          <>
            {/* Vertical slats — evenly spaced edge to edge */}
            {(() => {
              const slatCount = 5;
              const gap = backThick * 0.6; // gap between slats
              const totalGaps = (slatCount - 1) * gap;
              const slatW = (w - totalGaps) / slatCount;
              return Array.from({ length: slatCount }).map((_, i) => {
                const x = -w / 2 + slatW / 2 + i * (slatW + gap);
                return (
                  <mesh key={`slat-${i}`} position={[x, seatY + backH / 2 + seatThick / 2, d / 2 - backThick / 2]} castShadow={settings.showShadows} receiveShadow>
                    <boxGeometry args={[slatW, backH, backThick]} />
                    <meshStandardMaterial color={chairBack} roughness={0.45} metalness={0.1} />
                  </mesh>
                );
              });
            })()}
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
              <meshStandardMaterial color={settings.matchSeatToLinen ? linenColor : chairGold} roughness={0.85} metalness={0} envMapIntensity={0.05} />
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
            <meshPhysicalMaterial color="#e8f0f8" roughness={0.05} metalness={0} transmission={0.85} thickness={1.0} ior={1.5} transparent opacity={0.5} />
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
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
        </mesh>
        {/* Seat cushion divider line */}
        <mesh position={[0, seatTopY + 0.02, 0]}>
          <boxGeometry args={[0.1 * S, 0.04, cushionD * 0.9]} />
          <meshStandardMaterial color={strokeColor} roughness={1} metalness={0} />
        </mesh>
        {/* Back rest */}
        <mesh position={[0, seatTopY + backH / 2, -cushionD / 2 - backThick / 2 + 1 * S]} castShadow receiveShadow>
          <boxGeometry args={[w - armW * 2, backH, backThick]} />
          <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
        </mesh>
        {/* Armrests */}
        {[-1, 1].map((side) => (
          <mesh key={`arm-${side}`} position={[side * (w / 2 - armW / 2), seatTopY + armH / 2, -backThick / 2]} castShadow receiveShadow>
            <boxGeometry args={[armW, armH, cushionD + backThick - 1 * S]} />
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
        </mesh>
        {/* Countertop with overhang — polished surface with beveled edges */}
        <RoundedBox args={[w + overhang, topThick, d + overhang]} radius={0.04} smoothness={4} position={[0, counterH - topThick / 2, overhang / 2]} castShadow receiveShadow>
          {isBar ? (
            <meshPhysicalMaterial color={strokeColor} roughness={0.35} metalness={0.15} envMapIntensity={0.9} clearcoat={0.4} clearcoatRoughness={0.15} />
          ) : (
            <meshStandardMaterial color={strokeColor} roughness={0.4} metalness={0.12} envMapIntensity={0.5} />
          )}
        </RoundedBox>
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
        {/* Main surface — light base color for dance floor, polished with clearcoat */}
        <mesh position={[0, floorH / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[w, floorH, d]} />
          {isDanceFloor ? (
            <meshPhysicalMaterial
              color={tileLight}
              roughness={0.15}
              metalness={0.08}
              envMapIntensity={pbr.envMapIntensity}
              clearcoat={pbr.clearcoat ?? 0}
              clearcoatRoughness={pbr.clearcoatRoughness ?? 0}
            />
          ) : (
            <meshStandardMaterial
              color={fillColor}
              roughness={pbr.roughness}
              metalness={pbr.metalness}
              envMapIntensity={pbr.envMapIntensity}
            />
          )}
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
        {/* Dance floor checkerboard — dark tiles + visible grout lines */}
        {isDanceFloor && (() => {
          const tileSizeW = Math.max(w / 5, 2);
          const tileSizeD = Math.max(d / 5, 2);
          const cols = Math.floor(w / tileSizeW);
          const rows = Math.floor(d / tileSizeD);
          const gap = 0.02;
          const tiles: JSX.Element[] = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if ((r + c) % 2 === 1) {
                const tx = -w / 2 + tileSizeW / 2 + c * tileSizeW;
                const tz = -d / 2 + tileSizeD / 2 + r * tileSizeD;
                tiles.push(
                  <mesh key={`tile-${r}-${c}`} position={[tx, floorH + 0.04, tz]}>
                    <boxGeometry args={[tileSizeW - gap * 2, 0.04, tileSizeD - gap * 2]} />
                    <meshStandardMaterial color={tileDark} roughness={0.15} metalness={0.08} />
                  </mesh>
                );
              }
            }
          }
          // Grout / gap lines between tile rows and columns
          const groutColor = getCachedColor("#8a8070");
          for (let r = 1; r < rows; r++) {
            const gz = -d / 2 + r * tileSizeD;
            tiles.push(
              <mesh key={`grout-h-${r}`} position={[0, floorH + 0.02, gz]}>
                <boxGeometry args={[w, 0.01, gap]} />
                <meshStandardMaterial color={groutColor} roughness={0.8} metalness={0} />
              </mesh>
            );
          }
          for (let c = 1; c < cols; c++) {
            const gx = -w / 2 + c * tileSizeW;
            tiles.push(
              <mesh key={`grout-v-${c}`} position={[gx, floorH + 0.02, 0]}>
                <boxGeometry args={[gap, 0.01, d]} />
                <meshStandardMaterial color={groutColor} roughness={0.8} metalness={0} />
              </mesh>
            );
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
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
        {/* Front edge trim — polished accent strip */}
        <RoundedBox args={[w + 0.2, trimH, 0.2]} radius={0.02} smoothness={3} position={[0, h3d - trimH / 2, d / 2 + 0.1]}>
          <meshPhysicalMaterial color={strokeColor} roughness={0.3} metalness={0.1} envMapIntensity={0.5} clearcoat={0.2} clearcoatRoughness={0.1} />
        </RoundedBox>
        {/* LED accent line at front base */}
        <mesh position={[0, 0.08, d / 2 + 0.15]}>
          <boxGeometry args={[w, 0.06, 0.08]} />
          <meshStandardMaterial color={getCachedColor("#e8e0d0")} emissive={getCachedColor("#fff5e6")} emissiveIntensity={0.3} roughness={0.1} metalness={0} />
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
            <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
          <meshStandardMaterial color={darkColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
          </mesh>
        ))}
        {/* Top frame */}
        <mesh position={[0, postH - topThick / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, topThick, d]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
          </mesh>
        ))}
        {/* Columns — tapered */}
        {[leftColX, rightColX].map((cx, i) => (
          <mesh key={`col-${i}`} position={[cx, postH / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[postRadius * 0.75, postRadius, postH, 12]} />
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
          </mesh>
        ))}
        {/* Column capitals */}
        {[leftColX, rightColX].map((cx, i) => (
          <mesh key={`cap-${i}`} position={[cx, postH - 1.5 * S, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[postRadius * 1.2, postRadius * 0.85, 3 * S, 12]} />
            <meshStandardMaterial color={strokeColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
          </mesh>
        ))}
        {/* Decorative sphere finials on capitals */}
        {[leftColX, rightColX].map((cx, i) => (
          <mesh key={`finial-${i}`} position={[cx, postH + postRadius * 0.4, 0]} castShadow>
            <sphereGeometry args={[postRadius * 0.4, 8, 8]} />
            <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
              <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
            </mesh>
          );
        })}
        {/* Keystone at apex */}
        <mesh position={[0, postH + arcRise, 0]} castShadow>
          <sphereGeometry args={[2.5 * S, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
          <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
        <meshStandardMaterial color={fillColor} roughness={pbr.roughness} metalness={pbr.metalness} envMapIntensity={pbr.envMapIntensity} />
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
