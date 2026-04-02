"use client";

import { useMemo } from "react";
import { DoubleSide, Vector3, QuadraticBezierCurve3, TubeGeometry, Color, BackSide, BufferGeometry, Float32BufferAttribute } from "three";

// ── Types ──

export type VenuePreset = "none" | "indoor-ballroom" | "tent" | "outdoor-garden" | "rooftop" | "barn" | "beach";

export type VenueElement =
  | "tent-structure"
  | "grass-floor"
  | "sand-floor"
  | "sky-dome"
  | "string-lights"
  | "exposed-beams"
  | "low-railing"
  | "chandeliers";

export interface VenuePresetDef {
  label: string;
  floorMaterial: "hardwood" | "marble" | "carpet" | "concrete";
  lightingMood: "warm" | "cool" | "neutral" | "dramatic";
  floorOverride?: { color: string; roughness: number; metalness: number };
  showWalls: boolean;
  environmentPreset: "studio" | "sunset" | "dawn" | "night" | "park" | "city";
  fogColor: string;
  elements: VenueElement[];
}

export const VENUE_PRESETS: Record<VenuePreset, VenuePresetDef | null> = {
  none: null,
  "indoor-ballroom": {
    label: "Ballroom",
    floorMaterial: "marble",
    lightingMood: "warm",
    showWalls: true,
    environmentPreset: "studio",
    fogColor: "#f0ece6",
    elements: [],
  },
  tent: {
    label: "Tent",
    floorMaterial: "carpet",
    lightingMood: "warm",
    showWalls: false,
    environmentPreset: "sunset",
    fogColor: "#e8e4d8",
    elements: ["tent-structure", "grass-floor"],
  },
  "outdoor-garden": {
    label: "Garden",
    floorMaterial: "concrete",
    lightingMood: "neutral",
    floorOverride: { color: "#6b8f4e", roughness: 0.95, metalness: 0.0 },
    showWalls: false,
    environmentPreset: "park",
    fogColor: "#d8e4d0",
    elements: ["grass-floor", "sky-dome"],
  },
  rooftop: {
    label: "Rooftop",
    floorMaterial: "concrete",
    lightingMood: "cool",
    showWalls: false,
    environmentPreset: "city",
    fogColor: "#d0d4e0",
    elements: ["low-railing", "sky-dome"],
  },
  barn: {
    label: "Barn",
    floorMaterial: "hardwood",
    lightingMood: "dramatic",
    showWalls: true,
    environmentPreset: "dawn",
    fogColor: "#e8dcd0",
    elements: ["exposed-beams"],
  },
  beach: {
    label: "Beach",
    floorMaterial: "concrete",
    lightingMood: "warm",
    floorOverride: { color: "#e8dcc8", roughness: 0.98, metalness: 0.0 },
    showWalls: false,
    environmentPreset: "sunset",
    fogColor: "#e0dcd4",
    elements: ["sky-dome", "sand-floor"],
  },
};

// ── Procedural Venue Components ──

const TENT_PEAK = 28; // peak height in world units
const TENT_EDGE = 18; // edge height — tall enough to walk under comfortably
const POLE_RADIUS = 0.08;

function TentStructure({ cx, cz, span }: { cx: number; cz: number; span: number }) {
  const half = span * 0.5;
  const poleColor = new Color("#8a7a6a");
  const canopyColor = new Color("#f5f0e6");

  const corners: [number, number][] = [
    [cx - half, cz - half],
    [cx + half, cz - half],
    [cx + half, cz + half],
    [cx - half, cz + half],
  ];

  // Build a single unified canopy mesh with proper triangle geometry
  // Peak at center top, 4 triangular faces sloping down to each edge
  const canopyGeometry = useMemo(() => {
    const geo = new BufferGeometry();

    // Vertices: center peak + 4 corners
    // Add a slight droop at edge midpoints for a more natural catenary look
    const edgeSag = (TENT_PEAK - TENT_EDGE) * 0.15; // subtle sag at midpoints
    const peak: [number, number, number] = [cx, TENT_PEAK, cz];
    const c0: [number, number, number] = [cx - half, TENT_EDGE, cz - half];
    const c1: [number, number, number] = [cx + half, TENT_EDGE, cz - half];
    const c2: [number, number, number] = [cx + half, TENT_EDGE, cz + half];
    const c3: [number, number, number] = [cx - half, TENT_EDGE, cz + half];
    // Edge midpoints (between adjacent corners) with slight sag for natural drape
    const m01: [number, number, number] = [(c0[0] + c1[0]) / 2, TENT_EDGE - edgeSag, (c0[2] + c1[2]) / 2];
    const m12: [number, number, number] = [(c1[0] + c2[0]) / 2, TENT_EDGE - edgeSag, (c1[2] + c2[2]) / 2];
    const m23: [number, number, number] = [(c2[0] + c3[0]) / 2, TENT_EDGE - edgeSag, (c2[2] + c3[2]) / 2];
    const m30: [number, number, number] = [(c3[0] + c0[0]) / 2, TENT_EDGE - edgeSag, (c3[2] + c0[2]) / 2];

    // Each face (peak to edge) is subdivided into 2 triangles via the edge midpoint
    // Face 0: peak → c0 → m01, peak → m01 → c1
    // Face 1: peak → c1 → m12, peak → m12 → c2
    // Face 2: peak → c2 → m23, peak → m23 → c3
    // Face 3: peak → c3 → m30, peak → m30 → c0
    const verts = new Float32Array([
      // Face 0 — front
      ...peak, ...c0, ...m01,
      ...peak, ...m01, ...c1,
      // Face 1 — right
      ...peak, ...c1, ...m12,
      ...peak, ...m12, ...c2,
      // Face 2 — back
      ...peak, ...c2, ...m23,
      ...peak, ...m23, ...c3,
      // Face 3 — left
      ...peak, ...c3, ...m30,
      ...peak, ...m30, ...c0,
    ]);

    geo.setAttribute("position", new Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  }, [cx, cz, half]);

  return (
    <group>
      {/* Center pole — tallest */}
      <mesh position={[cx, TENT_PEAK / 2, cz]} castShadow>
        <cylinderGeometry args={[POLE_RADIUS * 1.2, POLE_RADIUS * 1.5, TENT_PEAK, 8]} />
        <meshStandardMaterial color={poleColor} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* 4 corner poles */}
      {corners.map(([px, pz], i) => (
        <mesh key={`pole-${i}`} position={[px, TENT_EDGE / 2, pz]} castShadow>
          <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS * 1.3, TENT_EDGE, 8]} />
          <meshStandardMaterial color={poleColor} roughness={0.4} metalness={0.2} />
        </mesh>
      ))}

      {/* Canopy — unified triangulated mesh from peak to corners */}
      <mesh geometry={canopyGeometry} receiveShadow>
        <meshStandardMaterial
          color={canopyColor}
          roughness={0.95}
          metalness={0}
          side={DoubleSide}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Valance / edge trim along bottom of canopy */}
      {corners.map(([px, pz], i) => {
        const next = corners[(i + 1) % 4];
        const edgeMidX = (px + next[0]) / 2;
        const edgeMidZ = (pz + next[1]) / 2;
        const edgeLen = Math.sqrt((next[0] - px) ** 2 + (next[1] - pz) ** 2);
        const edgeAngle = Math.atan2(next[1] - pz, next[0] - px);
        return (
          <mesh
            key={`valance-${i}`}
            position={[edgeMidX, TENT_EDGE - 0.3, edgeMidZ]}
            rotation={[0, -edgeAngle, 0]}
          >
            <boxGeometry args={[edgeLen, 0.6, 0.05]} />
            <meshStandardMaterial color={canopyColor} roughness={0.95} metalness={0} transparent opacity={0.85} />
          </mesh>
        );
      })}

      {/* Ridge lines — thin beams from peak to each corner for structural detail */}
      {corners.map(([px, pz], i) => {
        const dx = px - cx;
        const dz = pz - cz;
        const dy = TENT_EDGE - TENT_PEAK;
        const ridgeLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const midX = (cx + px) / 2;
        const midY = (TENT_PEAK + TENT_EDGE) / 2;
        const midZ = (cz + pz) / 2;
        // Rotation: point cylinder from peak toward corner
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        const pitch = Math.atan2(-dy, horizDist); // tilt down from peak
        const yaw = Math.atan2(dx, dz); // direction in XZ plane

        return (
          <mesh
            key={`ridge-${i}`}
            position={[midX, midY, midZ]}
            rotation={[pitch, yaw, 0]}
          >
            <cylinderGeometry args={[POLE_RADIUS * 0.6, POLE_RADIUS * 0.6, ridgeLen, 6]} />
            <meshStandardMaterial color={poleColor} roughness={0.5} metalness={0.15} />
          </mesh>
        );
      })}
    </group>
  );
}

function GrassFloor({ cx, cz, span }: { cx: number; cz: number; span: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, cz]} receiveShadow>
      <planeGeometry args={[span * 2.5, span * 2.5]} />
      <meshStandardMaterial color="#6b8f4e" roughness={0.95} metalness={0.0} />
    </mesh>
  );
}

function SandFloor({ cx, cz, span }: { cx: number; cz: number; span: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, cz]} receiveShadow>
      <planeGeometry args={[span * 2.5, span * 2.5]} />
      <meshStandardMaterial color="#e8dcc8" roughness={0.98} metalness={0.0} />
    </mesh>
  );
}

function SkyDome({ cx, cz, span }: { cx: number; cz: number; span: number }) {
  return (
    <mesh position={[cx, 0, cz]}>
      <sphereGeometry args={[span * 3, 32, 16]} />
      <meshBasicMaterial color="#b8d4e8" side={BackSide} />
    </mesh>
  );
}

function StringLights({ cx, cz, span }: { cx: number; cz: number; span: number }) {
  const half = span * 0.5;
  const height = 10;
  const sag = 1.5;
  const bulbCount = 12;
  const bulbColor = new Color("#ffe8b0");

  // Generate 3 parallel strings
  const strings = useMemo(() => {
    const result: { points: Vector3[]; tube: TubeGeometry }[] = [];
    const offsets = [-half * 0.6, 0, half * 0.6];

    for (const offsetX of offsets) {
      const start = new Vector3(cx + offsetX, height, cz - half * 0.8);
      const end = new Vector3(cx + offsetX, height, cz + half * 0.8);
      const mid = new Vector3(cx + offsetX, height - sag, cz);
      const curve = new QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(bulbCount);
      const tube = new TubeGeometry(curve, 20, 0.015, 4, false);
      result.push({ points, tube });
    }
    return result;
  }, [cx, cz, half, height, sag, bulbCount]);

  return (
    <group>
      {strings.map((strand, si) => (
        <group key={`strand-${si}`}>
          {/* Wire */}
          <mesh geometry={strand.tube}>
            <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.3} />
          </mesh>
          {/* Bulbs */}
          {strand.points.map((pt, bi) => (
            <group key={`bulb-${si}-${bi}`} position={[pt.x, pt.y - 0.08, pt.z]}>
              <mesh>
                <sphereGeometry args={[0.06, 8, 6]} />
                <meshStandardMaterial
                  color={bulbColor}
                  emissive={bulbColor}
                  emissiveIntensity={0.8}
                  roughness={0.3}
                  metalness={0.1}
                />
              </mesh>
              {/* Subtle glow */}
              <pointLight color="#ffe8b0" intensity={0.15} distance={3} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function ExposedBeams({ cx, cz, span }: { cx: number; cz: number; span: number }) {
  const beamHeight = 20;
  const beamCount = Math.max(3, Math.floor(span / 4));
  const beamWidth = 0.3;
  const beamDepth = 0.5;
  const half = span * 0.5;
  const beamColor = new Color("#5a4535");

  return (
    <group>
      {/* Main ridge beam along Z */}
      <mesh position={[cx, beamHeight, cz]} >
        <boxGeometry args={[beamWidth, beamDepth, span * 1.1]} />
        <meshStandardMaterial color={beamColor} roughness={0.8} metalness={0.0} />
      </mesh>
      {/* Cross beams along X */}
      {Array.from({ length: beamCount }).map((_, i) => {
        const z = cz - half + (i + 0.5) * (span / beamCount);
        return (
          <mesh key={`beam-${i}`} position={[cx, beamHeight - beamDepth, z]}>
            <boxGeometry args={[span * 1.1, beamDepth * 0.8, beamWidth]} />
            <meshStandardMaterial color={beamColor} roughness={0.8} metalness={0.0} />
          </mesh>
        );
      })}
    </group>
  );
}

function LowRailing({ cx, cz, span }: { cx: number; cz: number; span: number }) {
  const half = span * 0.5;
  const railHeight = 1.1; // ~3.5 feet
  const postSpacing = 1.5;
  const postRadius = 0.04;
  const railColor = new Color("#4a4a4a");
  const glassColor = new Color("#c8dce8");

  // Generate posts along 4 edges
  const edges: { start: [number, number]; end: [number, number] }[] = [
    { start: [cx - half, cz - half], end: [cx + half, cz - half] },
    { start: [cx + half, cz - half], end: [cx + half, cz + half] },
    { start: [cx + half, cz + half], end: [cx - half, cz + half] },
    { start: [cx - half, cz + half], end: [cx - half, cz - half] },
  ];

  return (
    <group>
      {edges.map((edge, ei) => {
        const dx = edge.end[0] - edge.start[0];
        const dz = edge.end[1] - edge.start[1];
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const count = Math.max(2, Math.floor(len / postSpacing));
        const midX = (edge.start[0] + edge.end[0]) / 2;
        const midZ = (edge.start[1] + edge.end[1]) / 2;

        return (
          <group key={`edge-${ei}`}>
            {/* Posts */}
            {Array.from({ length: count + 1 }).map((_, pi) => {
              const t = pi / count;
              const px = edge.start[0] + dx * t;
              const pz = edge.start[1] + dz * t;
              return (
                <mesh key={`post-${ei}-${pi}`} position={[px, railHeight / 2, pz]} castShadow>
                  <cylinderGeometry args={[postRadius, postRadius, railHeight, 6]} />
                  <meshStandardMaterial color={railColor} roughness={0.3} metalness={0.4} />
                </mesh>
              );
            })}
            {/* Top rail */}
            <mesh position={[midX, railHeight, midZ]} rotation={[0, -angle, 0]} castShadow>
              <boxGeometry args={[len, 0.06, 0.06]} />
              <meshStandardMaterial color={railColor} roughness={0.3} metalness={0.4} />
            </mesh>
            {/* Glass panel */}
            <mesh position={[midX, railHeight * 0.5, midZ]} rotation={[0, -angle, 0]}>
              <boxGeometry args={[len, railHeight * 0.85, 0.02]} />
              <meshStandardMaterial
                color={glassColor}
                roughness={0.1}
                metalness={0.05}
                transparent
                opacity={0.2}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Chandeliers({ cx, cz, span }: { cx: number; cz: number; span: number }) {
  const chandelierHeight = 11;
  const chandelierColor = new Color("#c4a870");
  const half = span * 0.3;

  // Place 1-3 chandeliers depending on span
  const positions = span > 8
    ? [[cx, chandelierHeight, cz - half], [cx, chandelierHeight, cz], [cx, chandelierHeight, cz + half]]
    : [[cx, chandelierHeight, cz]];

  return (
    <group>
      {positions.map((pos, i) => (
        <group key={`chandelier-${i}`} position={pos as [number, number, number]}>
          {/* Chain */}
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2, 4]} />
            <meshStandardMaterial color="#555" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Main ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.6, 0.04, 8, 24]} />
            <meshStandardMaterial color={chandelierColor} roughness={0.3} metalness={0.35} />
          </mesh>
          {/* Inner ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.35, 0.03, 8, 20]} />
            <meshStandardMaterial color={chandelierColor} roughness={0.3} metalness={0.35} />
          </mesh>
          {/* Arms + candles */}
          {[0, 1, 2, 3, 4, 5].map((j) => {
            const a = (j / 6) * Math.PI * 2;
            const armX = Math.cos(a) * 0.6;
            const armZ = Math.sin(a) * 0.6;
            return (
              <group key={`arm-${j}`}>
                {/* Arm */}
                <mesh position={[armX / 2, 0, armZ / 2]} rotation={[0, -a, 0]}>
                  <boxGeometry args={[0.6, 0.03, 0.03]} />
                  <meshStandardMaterial color={chandelierColor} roughness={0.3} metalness={0.35} />
                </mesh>
                {/* Candle */}
                <mesh position={[armX, 0.12, armZ]}>
                  <cylinderGeometry args={[0.025, 0.025, 0.2, 6]} />
                  <meshStandardMaterial color="#f5f0e0" roughness={0.9} metalness={0} />
                </mesh>
                {/* Flame glow */}
                <pointLight
                  position={[armX, 0.28, armZ]}
                  color="#ffe4a0"
                  intensity={0.2}
                  distance={4}
                />
              </group>
            );
          })}
          {/* Central downlight */}
          <pointLight color="#fff0d0" intensity={0.5} distance={8} position={[0, -0.3, 0]} />
        </group>
      ))}
    </group>
  );
}

// ── Main VenueEnvironment Component ──

interface VenueEnvironmentProps {
  preset: VenuePresetDef | null;
  cx: number;
  cz: number;
  maxDim: number;
}

export default function VenueEnvironment({ preset, cx, cz, maxDim }: VenueEnvironmentProps) {
  if (!preset) return null;

  const elements = preset.elements;

  return (
    <group>
      {elements.includes("tent-structure") && (
        <TentStructure cx={cx} cz={cz} span={maxDim} />
      )}
      {elements.includes("grass-floor") && (
        <GrassFloor cx={cx} cz={cz} span={maxDim} />
      )}
      {elements.includes("sand-floor") && (
        <SandFloor cx={cx} cz={cz} span={maxDim} />
      )}
      {elements.includes("sky-dome") && (
        <SkyDome cx={cx} cz={cz} span={maxDim} />
      )}
      {elements.includes("string-lights") && (
        <StringLights cx={cx} cz={cz} span={maxDim} />
      )}
      {elements.includes("exposed-beams") && (
        <ExposedBeams cx={cx} cz={cz} span={maxDim} />
      )}
      {elements.includes("low-railing") && (
        <LowRailing cx={cx} cz={cz} span={maxDim} />
      )}
      {elements.includes("chandeliers") && (
        <Chandeliers cx={cx} cz={cz} span={maxDim} />
      )}
    </group>
  );
}
