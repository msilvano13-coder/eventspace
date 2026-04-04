"use client";

import React, { useMemo } from "react";
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
}: {
  floorMaterial: View3DSettings["floorMaterial"];
  floorColor: string | null;
  bbox: { cx: number; cz: number; w: number; d: number };
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
      tex.anisotropy = 8;
    }
  }, [albedoTex, normalTex, roughTex, aoTex, paths.ao, repeat, bbox.w, bbox.d]);

  // Floor color behavior:
  // - No custom color (null): show raw texture as-is
  // - Custom color set: use the color directly, texture provides detail/pattern only
  //   via normal + roughness maps (albedo map is dimmed so color dominates)
  const hasCustomColor = !!floorColor;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bbox.cx, 0.001, bbox.cz]} receiveShadow>
      <planeGeometry args={[bbox.w, bbox.d]} />
      <meshStandardMaterial
        map={hasCustomColor ? null : albedoTex}
        normalMap={normalTex}
        normalScale={new THREE.Vector2(0.8, 0.8)}
        roughnessMap={roughTex}
        aoMap={paths.ao ? aoTex : null}
        aoMapIntensity={0.6}
        color={floorColor ?? "#ffffff"}
        metalness={matProps.metalness}
        envMapIntensity={matProps.envMapIntensity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Main RoomFloor Component ──

export function RoomFloor({ obj, originX, originY, settings, showWalls = true, floorOverride }: {
  obj: ParsedObject;
  originX: number;
  originY: number;
  settings: View3DSettings;
  showWalls?: boolean;
  floorOverride?: { color: string; roughness: number; metalness: number };
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
  const isReflective = !floorOverride && (settings.floorMaterial === "marble" || settings.floorMaterial === "hardwood" || settings.floorMaterial === "tile");

  return (
    <group>
      {/* Floor: textured (medium/high) or solid color (low / venue override) */}
      {useTextures ? (
        <TexturedFloor
          floorMaterial={settings.floorMaterial}
          floorColor={settings.floorColor}
          bbox={roomBBox}
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
      {showWalls && (() => {
        const wBase = settings.wallColor ?? "#f5f0e8";
        const wBaseboard = settings.wallColor ? adjustBrightness(wBase, -0.15) : "#cdc5b8";
        const wWainscot = settings.wallColor ? adjustBrightness(wBase, -0.05) : "#e8e2d8";
        const wRail = settings.wallColor ? adjustBrightness(wBase, -0.10) : "#d8d0c4";
        const wUpper = wBase;
        const wCrown = settings.wallColor ? adjustBrightness(wBase, -0.07) : "#e0d8ce";
        return (
          <>
            {wallSegments.map((seg, i) => (
              <mesh key={`base-${i}`} position={[seg.cx, 0.15, seg.cz]} rotation={[0, -seg.angle, 0]}>
                <boxGeometry args={[seg.length, 0.3, wallThickness + 0.06]} />
                <meshStandardMaterial color={wBaseboard} roughness={0.5} metalness={0.04} />
              </mesh>
            ))}
            {wallSegments.map((seg, i) => (
              <mesh key={`wainscot-${i}`} position={[seg.cx, WALL_HEIGHT * 0.19, seg.cz]} rotation={[0, -seg.angle, 0]} receiveShadow>
                <boxGeometry args={[seg.length, WALL_HEIGHT * 0.35, wallThickness * 0.85]} />
                <meshStandardMaterial color={wWainscot} roughness={0.75} metalness={0.02} transparent opacity={0.85} />
              </mesh>
            ))}
            {wallSegments.map((seg, i) => (
              <mesh key={`rail-${i}`} position={[seg.cx, WALL_HEIGHT * 0.38, seg.cz]} rotation={[0, -seg.angle, 0]}>
                <boxGeometry args={[seg.length, 0.08, wallThickness + 0.03]} />
                <meshStandardMaterial color={wRail} roughness={0.45} metalness={0.06} />
              </mesh>
            ))}
            {wallSegments.map((seg, i) => (
              <mesh key={`wall-${i}`} position={[seg.cx, WALL_HEIGHT * 0.68, seg.cz]} rotation={[0, -seg.angle, 0]} receiveShadow>
                <boxGeometry args={[seg.length, WALL_HEIGHT * 0.6, wallThickness]} />
                <meshStandardMaterial color={wUpper} roughness={0.92} metalness={0} transparent opacity={0.75} />
              </mesh>
            ))}
            {wallSegments.map((seg, i) => (
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
