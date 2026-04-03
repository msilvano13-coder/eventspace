"use client";

import React, { useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import { Vector2, Shape, DoubleSide } from "three";
import { getFloorTextures } from "./floor-textures";
import {
  S,
  WALL_HEIGHT,
  FLOOR_MATERIALS,
  adjustBrightness,
  type ParsedObject,
  type View3DSettings,
} from "./constants";

export function RoomFloor({ obj, originX, originY, settings, showWalls = true, floorOverride }: { obj: ParsedObject; originX: number; originY: number; settings: View3DSettings; showWalls?: boolean; floorOverride?: { color: string; roughness: number; metalness: number } }) {
  // Memoize shape to avoid re-creating on every render
  const floorShape = useMemo(() => {
    if (!obj.points || obj.points.length < 3) return null;
    // Points are already absolute canvas coordinates (precomputed in parseCanvasJSON).
    // Negate Y because the Shape (XY plane) is rotated -pi/2 around X,
    // mapping Shape Y -> World -Z.  Furniture uses posZ = +(canvasY - originY),
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

  // Generate full PBR texture set for non-override floors (must be before early return)
  const floorTextures = useMemo(() => {
    if (floorOverride) return null; // venue overrides (grass, sand) don't need procedural textures
    return getFloorTextures(settings.floorMaterial, 512);
  }, [settings.floorMaterial, floorOverride]);

  // Compute bounding rect for reflection plane
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

  if (!floorShape) return null;

  const wallThickness = 0.15;
  const baseFloorMat = FLOOR_MATERIALS[settings.floorMaterial];
  const floorMat = floorOverride ?? (settings.floorColor ? { ...baseFloorMat, color: settings.floorColor } : baseFloorMat);
  const isReflective = !floorOverride && (settings.floorMaterial === "marble" || settings.floorMaterial === "hardwood");

  return (
    <group>
      {/* Floor — reflective for marble/hardwood, textured for others */}
      {isReflective && roomBBox ? (
        <mesh key={`floor-reflect-${floorMat.color}`} rotation={[-Math.PI / 2, 0, 0]} position={[roomBBox.cx, 0.001, roomBBox.cz]} receiveShadow>
          <planeGeometry args={[roomBBox.w, roomBBox.d]} />
          <MeshReflectorMaterial
            mirror={settings.floorMaterial === "marble" ? 0.15 : 0.08}
            blur={settings.floorMaterial === "marble" ? [600, 300] : [800, 400]}
            resolution={512}
            mixBlur={1}
            mixStrength={settings.floorMaterial === "marble" ? 0.4 : 0.2}
            roughness={floorMat.roughness}
            metalness={floorMat.metalness}
            color={floorMat.color}
            depthScale={0}
          />
        </mesh>
      ) : (
        <mesh key={`floor-${floorMat.color}-${floorMat.roughness}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <extrudeGeometry args={[floorShape, { depth: 0.02, bevelEnabled: false }]} />
          <meshStandardMaterial
            color={floorTextures ? (settings.floorColor ?? "#ffffff") : floorMat.color}
            map={floorTextures?.albedo ?? null}
            side={DoubleSide}
            roughness={floorTextures ? 1.0 : floorMat.roughness}
            roughnessMap={floorTextures?.roughness ?? null}
            metalness={floorMat.metalness}
            envMapIntensity={(floorMat as { envMapIntensity?: number }).envMapIntensity ?? 0.3}
            normalMap={floorTextures?.normal ?? null}
            normalScale={floorTextures ? new Vector2(0.4, 0.4) : undefined}
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
          {/* Baseboard — solid trim at floor level */}
          {wallSegments.map((seg, i) => (
            <mesh
              key={`base-${i}`}
              position={[seg.cx, 0.15, seg.cz]}
              rotation={[0, -seg.angle, 0]}
            >
              <boxGeometry args={[seg.length, 0.3, wallThickness + 0.06]} />
              <meshStandardMaterial color={wBaseboard} roughness={0.5} metalness={0.04} />
            </mesh>
          ))}
          {/* Lower wall — wainscoting panel */}
          {wallSegments.map((seg, i) => (
            <mesh
              key={`wainscot-${i}`}
              position={[seg.cx, WALL_HEIGHT * 0.19, seg.cz]}
              rotation={[0, -seg.angle, 0]}
              receiveShadow
            >
              <boxGeometry args={[seg.length, WALL_HEIGHT * 0.35, wallThickness * 0.85]} />
              <meshStandardMaterial
                color={wWainscot}
                roughness={0.75}
                metalness={0.02}
                transparent
                opacity={0.85}
              />
            </mesh>
          ))}
          {/* Chair rail — horizontal trim between wainscoting and upper wall */}
          {wallSegments.map((seg, i) => (
            <mesh
              key={`rail-${i}`}
              position={[seg.cx, WALL_HEIGHT * 0.38, seg.cz]}
              rotation={[0, -seg.angle, 0]}
            >
              <boxGeometry args={[seg.length, 0.08, wallThickness + 0.03]} />
              <meshStandardMaterial color={wRail} roughness={0.45} metalness={0.06} />
            </mesh>
          ))}
          {/* Upper wall — solid coverage */}
          {wallSegments.map((seg, i) => (
            <mesh
              key={`wall-${i}`}
              position={[seg.cx, WALL_HEIGHT * 0.68, seg.cz]}
              rotation={[0, -seg.angle, 0]}
              receiveShadow
            >
              <boxGeometry args={[seg.length, WALL_HEIGHT * 0.6, wallThickness]} />
              <meshStandardMaterial
                color={wUpper}
                roughness={0.92}
                metalness={0}
                transparent
                opacity={0.75}
              />
            </mesh>
          ))}
          {/* Crown molding — deeper profile at ceiling */}
          {wallSegments.map((seg, i) => (
            <mesh
              key={`crown-${i}`}
              position={[seg.cx, WALL_HEIGHT - 0.1, seg.cz]}
              rotation={[0, -seg.angle, 0]}
            >
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
