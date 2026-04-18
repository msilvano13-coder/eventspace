"use client";

import React, { useMemo, useCallback } from "react";
import { useTexture, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useQuality } from "../QualityTier";
import {
  S,
  WALL_HEIGHT,
  FLOOR_MATERIALS,
  adjustBrightness,
  type ParsedObject,
  type View3DSettings,
} from "./constants";

// ── Texture paths per floor type ──

const FLOOR_TEXTURE_PATHS: Record<string, {
  albedo: string;
  normal: string;
  roughness: string;
  ao?: string;
}> = {
  hardwood: {
    albedo: "/textures/floors/wood_albedo.jpg",
    normal: "/textures/floors/wood_normal.jpg",
    roughness: "/textures/floors/wood_roughness.jpg",
    ao: "/textures/floors/wood_ao.jpg",
  },
  marble: {
    albedo: "/textures/floors/marble_albedo.jpg",
    normal: "/textures/floors/marble_normal.jpg",
    roughness: "/textures/floors/marble_roughness.jpg",
  },
  carpet: {
    albedo: "/textures/floors/carpet_albedo.jpg",
    normal: "/textures/floors/carpet_normal.jpg",
    roughness: "/textures/floors/carpet_roughness.jpg",
    ao: "/textures/floors/carpet_ao.jpg",
  },
  concrete: {
    albedo: "/textures/floors/concrete_albedo.jpg",
    normal: "/textures/floors/concrete_normal.jpg",
    roughness: "/textures/floors/concrete_roughness.jpg",
  },
  tile: {
    albedo: "/textures/floors/tile_albedo.jpg",
    normal: "/textures/floors/tile_normal.jpg",
    roughness: "/textures/floors/tile_roughness.jpg",
  },
};

// Tiling repeat per material type (how many times the texture repeats across the floor)
const FLOOR_TILE_REPEAT: Record<string, number> = {
  hardwood: 6,
  marble: 4,
  carpet: 8,
  concrete: 3,
  tile: 5,
};

// ── Textured Floor Component (quality-gated) ──

function TexturedFloor({
  floorMaterial,
  floorColor,
  bbox,
  anisotropy,
}: {
  floorMaterial: View3DSettings["floorMaterial"];
  floorColor: string | null;
  bbox: { cx: number; cz: number; w: number; d: number };
  anisotropy: number;
}) {
  const paths = FLOOR_TEXTURE_PATHS[floorMaterial];
  const repeat = FLOOR_TILE_REPEAT[floorMaterial] ?? 4;
  const matProps = FLOOR_MATERIALS[floorMaterial];

  // Load all texture maps
  const texturePaths = [paths.albedo, paths.normal, paths.roughness];
  if (paths.ao) texturePaths.push(paths.ao);

  // Load textures individually for clean typing
  const albedoTex = useTexture(paths.albedo);
  const normalTex = useTexture(paths.normal);
  const roughTex = useTexture(paths.roughness);
  const aoTex = useTexture(paths.ao ?? paths.albedo); // fallback to albedo if no AO

  // Configure tiling on all texture maps
  useMemo(() => {
    const allTextures = [albedoTex, normalTex, roughTex, ...(paths.ao ? [aoTex] : [])];
    for (const tex of allTextures) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat * (bbox.d / bbox.w));
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = anisotropy;
    }
  }, [albedoTex, normalTex, roughTex, aoTex, paths.ao, repeat, bbox.w, bbox.d, anisotropy]);

  // Floor color behavior:
  // - No custom color (null): show raw albedo texture as-is (full natural detail)
  // - Custom color set: shader converts albedo to grayscale "detail map"
  //   (preserving veining/grain pattern) then multiplies by user's chosen color.
  //   Result: white marble with dark veining, blue wood with grain, etc.
  //   This overcomes Three.js multiplicative color×albedo limitation.
  const hasCustomColor = !!floorColor;

  // Measure actual average luminance from the texture (one-time, downsampled)
  // so the shader can normalize correctly regardless of texture brightness
  const normFactor = useMemo(() => {
    const img = albedoTex.image;
    if (!img || !img.width) return 0.5;
    try {
      const canvas = document.createElement("canvas");
      const size = 64; // downsample for speed
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return 0.5;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let total = 0;
      const pixels = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        total += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      }
      const avg = total / pixels;
      return Math.max(avg, 0.1); // clamp to avoid division by near-zero
    } catch {
      return 0.5;
    }
  }, [albedoTex]);

  // Shader modifier: converts albedo to grayscale detail when custom color is active.
  // The detail map preserves surface pattern (marble veining, wood grain) while
  // allowing the user's color to dominate. Grayscale is normalized so average
  // brightness maps to 1.0 — this means picking white gives actual white.
  const onBeforeCompile = useCallback((shader: { fragmentShader: string }) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        #ifdef DECODE_VIDEO_TEXTURE
          sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.a );
        #endif
        // Convert to luminance-only detail: preserves texture pattern, removes color
        float _lum = dot(sampledDiffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        float _detail = clamp(_lum / ${normFactor.toFixed(3)}, 0.0, 1.5);
        // Apply: user_color × grayscale_detail (instead of user_color × full_texture)
        diffuseColor = vec4(diffuse * _detail, opacity * sampledDiffuseColor.a);
      #endif
      `
    );
  }, [normFactor]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bbox.cx, 0.001, bbox.cz]} receiveShadow>
      <planeGeometry args={[bbox.w, bbox.d]} />
      <meshStandardMaterial
        key={hasCustomColor ? `detail-${floorMaterial}` : `standard-${floorMaterial}`}
        map={albedoTex}
        normalMap={normalTex}
        normalScale={new THREE.Vector2(0.8, 0.8)}
        roughnessMap={roughTex}
        aoMap={paths.ao ? aoTex : null}
        aoMapIntensity={hasCustomColor ? 0.3 : 0.6}
        color={floorColor ?? "#ffffff"}
        metalness={matProps.metalness}
        envMapIntensity={matProps.envMapIntensity}
        side={THREE.DoubleSide}
        onBeforeCompile={hasCustomColor ? onBeforeCompile : undefined}
      />
    </mesh>
  );
}

// ── Main RoomFloor Component ──

// IDs of room feature furniture that should cut openings in walls
const WALL_OPENING_IDS = new Set(["door-single", "door-double", "window-standard", "window-floor", "bay-window"]);

// Represents a sub-segment of wall (after cutting openings)
interface WallSubSegment {
  cx: number;
  cz: number;
  length: number;
  angle: number;
}

/** Split a wall segment around nearby door/window furniture, returning sub-segments */
function splitWallAroundOpenings(
  seg: { x1: number; z1: number; x2: number; z2: number; length: number; angle: number; cx: number; cz: number },
  openings: { pos: number; halfWidth: number }[], // pos = projection along segment (0..length), halfWidth in world units
): WallSubSegment[] {
  if (openings.length === 0) return [{ cx: seg.cx, cz: seg.cz, length: seg.length, angle: seg.angle }];

  // Sort openings by position along the wall
  const sorted = [...openings].sort((a, b) => a.pos - b.pos);

  // Direction unit vector
  const dx = (seg.x2 - seg.x1) / seg.length;
  const dz = (seg.z2 - seg.z1) / seg.length;

  const subs: WallSubSegment[] = [];
  let cursor = 0; // how far along the wall we've consumed

  for (const op of sorted) {
    const gapStart = Math.max(0, op.pos - op.halfWidth);
    const gapEnd = Math.min(seg.length, op.pos + op.halfWidth);
    if (gapStart <= cursor) {
      cursor = Math.max(cursor, gapEnd);
      continue;
    }
    // Solid section before this opening
    const solidLen = gapStart - cursor;
    if (solidLen > 0.05) {
      const midT = cursor + solidLen / 2;
      subs.push({
        cx: seg.x1 + dx * midT,
        cz: seg.z1 + dz * midT,
        length: solidLen,
        angle: seg.angle,
      });
    }
    cursor = gapEnd;
  }

  // Remaining solid section after last opening
  const remaining = seg.length - cursor;
  if (remaining > 0.05) {
    const midT = cursor + remaining / 2;
    subs.push({
      cx: seg.x1 + dx * midT,
      cz: seg.z1 + dz * midT,
      length: remaining,
      angle: seg.angle,
    });
  }

  return subs;
}

export function RoomFloor({ obj, originX, originY, settings, showWalls = true, floorOverride, furnitureObjects }: {
  obj: ParsedObject;
  originX: number;
  originY: number;
  settings: View3DSettings;
  showWalls?: boolean;
  floorOverride?: { color: string; roughness: number; metalness: number };
  furnitureObjects?: ParsedObject[];
}) {
  const quality = useQuality();

  // Memoize shape for matte fallback floor
  const floorShape = useMemo(() => {
    if (!obj.points || obj.points.length < 3) return null;
    const shapePoints = obj.points.map(
      ([x, y]) => new THREE.Vector2((x - originX) * S, -(y - originY) * S)
    );
    return new THREE.Shape(shapePoints);
  }, [obj.points, originX, originY]);

  // Compute wall segments from polygon edges
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
      segments.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, length, angle, cx: (a.x + b.x) / 2, cz: (a.z + b.z) / 2 });
    }
    return segments;
  }, [obj.points, originX, originY]);

  // Split wall segments around door/window furniture to create openings
  const renderSegments = useMemo(() => {
    if (wallSegments.length === 0) return [];
    const doorWindowObjs = (furnitureObjects ?? []).filter((f) => WALL_OPENING_IDS.has(f.furnitureId));
    if (doorWindowObjs.length === 0) return wallSegments;

    // Convert furniture positions to world coords
    const openingsWorld = doorWindowObjs.map((f) => ({
      wx: (f.x - originX) * S,
      wz: (f.y - originY) * S,
      halfW: ((f.width || 36) * S) / 2,
    }));

    return wallSegments.flatMap((seg) => {
      // Find openings near this wall segment (within threshold distance)
      const nearOpenings: { pos: number; halfWidth: number }[] = [];
      for (const op of openingsWorld) {
        // Project furniture center onto the wall line
        const vx = seg.x2 - seg.x1;
        const vz = seg.z2 - seg.z1;
        const t = ((op.wx - seg.x1) * vx + (op.wz - seg.z1) * vz) / (seg.length * seg.length);
        if (t < -0.1 || t > 1.1) continue; // not near this wall
        // Perpendicular distance from wall
        const projX = seg.x1 + t * vx;
        const projZ = seg.z1 + t * vz;
        const perpDist = Math.sqrt((op.wx - projX) ** 2 + (op.wz - projZ) ** 2);
        if (perpDist > 1.0) continue; // too far from wall (>1 world unit = 12 inches)
        nearOpenings.push({ pos: t * seg.length, halfWidth: op.halfW });
      }
      return splitWallAroundOpenings(seg, nearOpenings);
    });
  }, [wallSegments, furnitureObjects, originX, originY]);

  // Compute bounding rect
  const roomBBox = useMemo(() => {
    if (!obj.points || obj.points.length < 3) return null;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, y] of obj.points) {
      const wx = (x - originX) * S;
      const wz = (y - originY) * S;
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wz < minZ) minZ = wz;
      if (wz > maxZ) maxZ = wz;
    }
    return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, w: maxX - minX, d: maxZ - minZ };
  }, [obj.points, originX, originY]);

  // Reflection config per material (must be before early return)
  const reflectConfig = useMemo(() => {
    switch (settings.floorMaterial) {
      case "marble":
        return { mirror: 0.25, blur: [400, 200] as [number, number], mixStrength: 0.5, resolution: 512 };
      case "tile":
        return { mirror: 0.15, blur: [500, 250] as [number, number], mixStrength: 0.35, resolution: 512 };
      case "hardwood":
        return { mirror: 0.08, blur: [800, 400] as [number, number], mixStrength: 0.2, resolution: 512 };
      default:
        return { mirror: 0, blur: [400, 200] as [number, number], mixStrength: 0, resolution: 256 };
    }
  }, [settings.floorMaterial]);

  if (!floorShape || !roomBBox) return null;

  const wallThickness = 0.15;
  const baseFloorMat = FLOOR_MATERIALS[settings.floorMaterial];
  const floorMat = floorOverride ?? (settings.floorColor ? { ...baseFloorMat, color: settings.floorColor } : baseFloorMat);
  const useTextures = quality.useTextures && !floorOverride;
  const isReflective = quality.useReflections && !floorOverride && (settings.floorMaterial === "marble" || settings.floorMaterial === "hardwood" || settings.floorMaterial === "tile");

  return (
    <group>
      {/* Floor: textured (medium/high) or solid color (low / venue override) */}
      {useTextures ? (
        <TexturedFloor
          floorMaterial={settings.floorMaterial}
          floorColor={settings.floorColor}
          bbox={roomBBox}
          anisotropy={quality.anisotropy}
        />
      ) : (
        <mesh key={`floor-${floorMat.color}-${settings.floorMaterial}`} rotation={[-Math.PI / 2, 0, 0]} position={[roomBBox.cx, 0.001, roomBBox.cz]} receiveShadow>
          <planeGeometry args={[roomBBox.w, roomBBox.d]} />
          <meshStandardMaterial
            color={floorMat.color}
            side={THREE.DoubleSide}
            roughness={floorMat.roughness}
            metalness={floorMat.metalness}
            envMapIntensity={(floorMat as { envMapIntensity?: number }).envMapIntensity ?? 0.3}
          />
        </mesh>
      )}

      {/* Reflective overlay for polished surfaces (marble, hardwood, tile) */}
      {isReflective && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[roomBBox.cx, useTextures ? 0.003 : 0.002, roomBBox.cz]} receiveShadow>
          <planeGeometry args={[roomBBox.w, roomBBox.d]} />
          <MeshReflectorMaterial
            mirror={reflectConfig.mirror}
            blur={reflectConfig.blur}
            resolution={reflectConfig.resolution}
            mixBlur={1}
            mixStrength={reflectConfig.mixStrength}
            roughness={floorMat.roughness}
            metalness={floorMat.metalness}
            color={floorMat.color}
            depthScale={0}
            transparent
            opacity={useTextures ? 0.3 : 1}
          />
        </mesh>
      )}

      {/* Walls, baseboard, crown — only when venue has walls */}
      {/* Wall segments are split around door/window furniture to create openings */}
      {showWalls && (() => {
        const wBase = settings.wallColor ?? "#f5f0e8";
        const wBaseboard = settings.wallColor ? adjustBrightness(wBase, -0.15) : "#cdc5b8";
        const wWainscot = settings.wallColor ? adjustBrightness(wBase, -0.05) : "#e8e2d8";
        const wRail = settings.wallColor ? adjustBrightness(wBase, -0.10) : "#d8d0c4";
        const wUpper = wBase;
        const wCrown = settings.wallColor ? adjustBrightness(wBase, -0.07) : "#e0d8ce";
        return (
          <>
            {renderSegments.map((seg, i) => (
              <mesh key={`base-${i}`} position={[seg.cx, 0.15, seg.cz]} rotation={[0, -seg.angle, 0]}>
                <boxGeometry args={[seg.length, 0.3, wallThickness + 0.06]} />
                <meshStandardMaterial color={wBaseboard} roughness={0.5} metalness={0.04} />
              </mesh>
            ))}
            {renderSegments.map((seg, i) => (
              <mesh key={`wainscot-${i}`} position={[seg.cx, WALL_HEIGHT * 0.19, seg.cz]} rotation={[0, -seg.angle, 0]} receiveShadow>
                <boxGeometry args={[seg.length, WALL_HEIGHT * 0.35, wallThickness * 0.85]} />
                <meshStandardMaterial color={wWainscot} roughness={0.75} metalness={0.02} transparent opacity={0.85} />
              </mesh>
            ))}
            {renderSegments.map((seg, i) => (
              <mesh key={`rail-${i}`} position={[seg.cx, WALL_HEIGHT * 0.38, seg.cz]} rotation={[0, -seg.angle, 0]}>
                <boxGeometry args={[seg.length, 0.08, wallThickness + 0.03]} />
                <meshStandardMaterial color={wRail} roughness={0.45} metalness={0.06} />
              </mesh>
            ))}
            {renderSegments.map((seg, i) => (
              <mesh key={`wall-${i}`} position={[seg.cx, WALL_HEIGHT * 0.68, seg.cz]} rotation={[0, -seg.angle, 0]} receiveShadow>
                <boxGeometry args={[seg.length, WALL_HEIGHT * 0.6, wallThickness]} />
                <meshStandardMaterial color={wUpper} roughness={0.92} metalness={0} transparent opacity={0.75} />
              </mesh>
            ))}
            {renderSegments.map((seg, i) => (
              <mesh key={`crown-${i}`} position={[seg.cx, WALL_HEIGHT - 0.1, seg.cz]} rotation={[0, -seg.angle, 0]}>
                <boxGeometry args={[seg.length, 0.2, wallThickness + 0.06]} />
                <meshStandardMaterial color={wCrown} roughness={0.45} metalness={0.06} />
              </mesh>
            ))}
          </>
        );
      })()}
    </group>
  );
}
