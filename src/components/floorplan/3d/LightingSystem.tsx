"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DoubleSide, Color } from "three";
import { SpotLight, useDepthBuffer } from "@react-three/drei";
import { LightingZone } from "@/lib/types";
import {
  S,
  DOWNLIGHT_TYPES,
  UPLIGHT_TYPES,
  getHeight,
  getCachedColor,
  type ParsedObject,
} from "./constants";
import { useQuality } from "../QualityTier";
import { getGoboTexture } from "./gobo-textures";

/** Candle light with warm flicker animation */
function CandleLight({ posX, posY, posZ, color, intensity, lightDistance, castShadow, shadowMapSize = 512 }: {
  posX: number; posY: number; posZ: number; color: Color;
  intensity: number; lightDistance: number; castShadow: boolean; shadowMapSize?: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const baseIntensity = intensity * 0.6;

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    // Organic flicker: layered sine waves at different frequencies
    const t = clock.getElapsedTime();
    const flicker = 1 + Math.sin(t * 8.3) * 0.12 + Math.sin(t * 13.7) * 0.08 + Math.sin(t * 21.1) * 0.05;
    lightRef.current.intensity = baseIntensity * flicker;
    if (flameRef.current) {
      flameRef.current.scale.y = 0.8 + flicker * 0.25;
    }
  });

  return (
    <group position={[posX, posY, posZ]}>
      <pointLight
        ref={lightRef}
        color={color}
        intensity={baseIntensity}
        distance={lightDistance}
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? shadowMapSize : undefined}
        shadow-mapSize-height={castShadow ? shadowMapSize : undefined}
      />
      {/* Candle body */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.03, 0.035, 0.24, 6]} />
        <meshStandardMaterial color="#f5f0e0" roughness={0.9} metalness={0} />
      </mesh>
      {/* Flame — emissive + toneMapped off so bloom picks it up */}
      <mesh ref={flameRef} position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color="#ffe080" emissive="#ffe080" emissiveIntensity={3} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      {/* Warm ground glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Gobo projector — native spotLight with texture map for pattern projection */
function GoboProjector({ color, intensity, distance, angle, penumbra, mountHeight, pattern, castShadow, shadowMapSize }: {
  color: Color; intensity: number; distance: number; angle: number; penumbra: number;
  mountHeight: number; pattern: string; castShadow: boolean; shadowMapSize: number;
}) {
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const goboMap = useMemo(() => getGoboTexture(pattern), [pattern]);

  useFrame(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
      if (spotRef.current.map !== goboMap) {
        spotRef.current.map = goboMap;
      }
    }
  });

  return (
    <>
      <spotLight
        ref={spotRef}
        color={color}
        intensity={intensity}
        distance={distance}
        angle={angle}
        penumbra={penumbra}
        position={[0, mountHeight, 0]}
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? shadowMapSize : undefined}
        shadow-mapSize-height={castShadow ? shadowMapSize : undefined}
      />
      <object3D ref={targetRef} position={[0, 0, 0]} />
    </>
  );
}

export function LightingZone3D({
  zone,
  originX,
  originY,
  canvasWidth,
  canvasHeight,
  castShadow,
  furnitureObjects,
  depthBuffer,
}: {
  zone: LightingZone;
  originX: number;
  originY: number;
  canvasWidth: number;
  canvasHeight: number;
  castShadow: boolean;
  furnitureObjects: ParsedObject[];
  depthBuffer?: THREE.DepthTexture;
}) {
  const quality = useQuality();
  const shadowMapSize = quality.tier === "high" ? 1024 : 512;

  const px = (zone.x / 100) * canvasWidth;
  const py = (zone.y / 100) * canvasHeight;
  const posX = (px - originX) * S;
  const posZ = (py - originY) * S;
  // Linear curve for visible intensity across full slider range
  const t = zone.intensity / 100;
  const intensity = 0.5 + t * 14.5;
  const color = getCachedColor(zone.color);
  const mountHeight = (zone.height ?? 8);  // in feet (= world units since S = 1/12)
  const spreadRad = ((zone.spread ?? 45) * Math.PI) / 180;
  const isDownlight = DOWNLIGHT_TYPES.has(zone.type);
  const isUplight = UPLIGHT_TYPES.has(zone.type);
  const lightDistance = zone.size * S * 6;

  // If snapped to furniture, calculate the surface height to place light on top
  let snapElevation = 0;
  if (zone.snappedToFurnitureId) {
    const snappedObj = furnitureObjects.find(
      (obj) => obj.label === zone.snappedToFurnitureId
    );
    if (snappedObj) {
      const h = getHeight(snappedObj.furnitureId);
      snapElevation = h * S;  // convert inches to world units
    }
  }

  // ── Downlight spotlight types: volumetric beam from ceiling down ──
  if (isDownlight) {
    const coneHeight = mountHeight * 0.85;
    const coneRadius = Math.tan(spreadRad / 2) * coneHeight;
    const useVolumetric = quality.tier !== "low";

    const isGobo = zone.type === "gobo";
    const goboPattern = zone.goboPattern ?? "leaves";

    return (
      <group position={[posX, 0, posZ]}>
        {isGobo ? (
          /* Gobo projector — native spotLight with texture map for pattern projection */
          <GoboProjector
            color={color}
            intensity={intensity * 2}
            distance={lightDistance * 1.5}
            angle={spreadRad / 2}
            penumbra={0.4}
            mountHeight={mountHeight}
            pattern={goboPattern}
            castShadow={castShadow}
            shadowMapSize={shadowMapSize}
          />
        ) : useVolumetric ? (
          /* drei SpotLight — volumetric beam with depth-aware occlusion */
          <SpotLight
            color={zone.color}
            intensity={intensity * 2}
            distance={lightDistance * 1.5}
            angle={spreadRad / 2}
            penumbra={0.5}
            position={[0, mountHeight, 0]}
            castShadow={castShadow}
            shadow-mapSize-width={castShadow ? shadowMapSize : undefined}
            shadow-mapSize-height={castShadow ? shadowMapSize : undefined}
            depthBuffer={depthBuffer}
            attenuation={8}
            anglePower={5}
            opacity={0.08 + t * 0.15}
          />
        ) : (
          /* Fallback for low tier — raw spotLight + cone geometry */
          <>
            <spotLight
              color={color}
              intensity={intensity * 2}
              distance={lightDistance * 1.5}
              angle={spreadRad / 2}
              penumbra={0.4}
              position={[0, mountHeight, 0]}
              target-position={[0, 0, 0]}
              castShadow={castShadow}
              shadow-mapSize-width={castShadow ? shadowMapSize : undefined}
              shadow-mapSize-height={castShadow ? shadowMapSize : undefined}
            />
            <mesh position={[0, mountHeight - coneHeight / 2, 0]}>
              <coneGeometry args={[coneRadius, coneHeight, 24, 1, true]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.06 + t * 0.22}
                side={DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </>
        )}

        {/* Fixture housing at mounting height */}
        <mesh position={[0, mountHeight, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 0.2, 8]} />
          <meshStandardMaterial color="#333" roughness={0.3} metalness={0.4} />
        </mesh>

        {/* Lens glow — emissive + toneMapped off so bloom picks it up */}
        <mesh position={[0, mountHeight - 0.12, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2 + t * 4} toneMapped={false} transparent opacity={0.9} />
        </mesh>

        {/* Ground light pool */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[coneRadius * 1.1, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.08 + t * 0.25}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // ── Uplight types: volumetric glow cone upward + wall wash ──
  if (isUplight) {
    const coneHeight = mountHeight * 1.2;
    const coneRadius = Math.tan(spreadRad / 2) * coneHeight;
    const useVolumetric = quality.tier !== "low";

    return (
      <group position={[posX, 0, posZ]}>
        {useVolumetric ? (
          /* drei SpotLight — volumetric upward beam with depth-aware occlusion */
          <SpotLight
            color={zone.color}
            intensity={intensity * 1.5}
            distance={lightDistance * 1.5}
            angle={spreadRad / 2}
            penumbra={0.4}
            position={[0, 0.2, 0]}
            castShadow={castShadow}
            shadow-mapSize-width={castShadow ? shadowMapSize : undefined}
            shadow-mapSize-height={castShadow ? shadowMapSize : undefined}
            depthBuffer={depthBuffer}
            attenuation={8}
            anglePower={4}
            opacity={0.06 + t * 0.15}
          />
        ) : (
          /* Fallback for low tier */
          <>
            <spotLight
              color={color}
              intensity={intensity * 1.5}
              distance={lightDistance * 1.5}
              angle={spreadRad / 2}
              penumbra={0.3}
              position={[0, 0.2, 0]}
              target-position={[0, mountHeight, 0]}
              castShadow={castShadow}
              shadow-mapSize-width={castShadow ? shadowMapSize : undefined}
              shadow-mapSize-height={castShadow ? shadowMapSize : undefined}
            />
            <mesh position={[0, 0.2 + coneHeight / 2, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[coneRadius, coneHeight, 24, 1, true]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.05 + t * 0.20}
                side={DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </>
        )}

        {/* Fixture on ground */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.2, 10]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
        </mesh>

        {/* Colored lens cap — high emissive + toneMapped off so bloom picks it up */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.04, 10]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.5 + t * 3}
            toneMapped={false}
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>

        {/* Point light at mid-wall height for actual colored wall illumination */}
        <pointLight
          color={color}
          intensity={intensity * 1.2}
          distance={mountHeight * 3}
          position={[0, mountHeight * 0.5, 0]}
        />

        {/* Wall wash — two perpendicular emissive planes for visible glow on walls */}
        <mesh
          position={[0, mountHeight * 0.45, 0]}
          rotation={[0, (zone.angle ?? 0) * Math.PI / 180, 0]}
        >
          <planeGeometry args={[coneRadius * 3, mountHeight * 0.85]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3 + t * 0.8}
            toneMapped={false}
            transparent
            opacity={0.04 + t * 0.14}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Second wash plane rotated 90° for cross-wash coverage */}
        <mesh
          position={[0, mountHeight * 0.45, 0]}
          rotation={[0, ((zone.angle ?? 0) + 90) * Math.PI / 180, 0]}
        >
          <planeGeometry args={[coneRadius * 3, mountHeight * 0.85]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.2 + t * 0.5}
            toneMapped={false}
            transparent
            opacity={0.03 + t * 0.10}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Ground light pool — radius scales with spread */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[0.5 + Math.tan(spreadRad / 2) * 1.2, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.1 + t * 0.25}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // ── Candles: warm flickering point lights ──
  if (zone.type === "candles") {
    const baseY = snapElevation > 0 ? snapElevation : 0;
    return (
      <CandleLight
        posX={posX}
        posY={baseY}
        posZ={posZ}
        color={color}
        intensity={intensity}
        lightDistance={lightDistance}
        castShadow={castShadow}
        shadowMapSize={shadowMapSize}
      />
    );
  }

  // ── Other types (string lights, etc.): point light + ground pool ──
  // If snapped to furniture, place on top of it; otherwise use mountHeight
  const baseY = snapElevation > 0 ? snapElevation : mountHeight;
  return (
    <group position={[posX, baseY, posZ]}>
      <pointLight
        color={color}
        intensity={intensity}
        distance={lightDistance}
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? shadowMapSize : undefined}
        shadow-mapSize-height={castShadow ? shadowMapSize : undefined}
      />
      {/* Fixture indicator — emissive + toneMapped off so bloom picks it up */}
      <mesh>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2 + t * 3} toneMapped={false} transparent opacity={0.8} />
      </mesh>
      {/* Ground light pool */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -baseY + 0.01, 0]}>
        <circleGeometry args={[Math.tan(spreadRad / 2) * baseY * 0.7, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08 + t * 0.20}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
