"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DoubleSide, Color } from "three";
import { LightingZone } from "@/lib/types";
import { kelvinToHex } from "@/lib/color-temperature";
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

/** Candle cluster — 3 votive candles in glass holders with warm flicker */
function CandleLight({ posX, posY, posZ, color, intensity, lightDistance, castShadow, shadowMapSize = 512 }: {
  posX: number; posY: number; posZ: number; color: Color;
  intensity: number; lightDistance: number; castShadow: boolean; shadowMapSize?: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const flame1Ref = useRef<THREE.Mesh>(null);
  const flame2Ref = useRef<THREE.Mesh>(null);
  const flame3Ref = useRef<THREE.Mesh>(null);
  const baseIntensity = intensity * 0.8;

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const elapsed = clock.getElapsedTime();
    // Each flame flickers at different frequencies for organic feel
    const f1 = 1 + Math.sin(elapsed * 8.3) * 0.15 + Math.sin(elapsed * 13.7) * 0.1 + Math.sin(elapsed * 21.1) * 0.06;
    const f2 = 1 + Math.sin(elapsed * 7.1 + 1) * 0.15 + Math.sin(elapsed * 15.3 + 2) * 0.1 + Math.sin(elapsed * 19.7 + 3) * 0.06;
    const f3 = 1 + Math.sin(elapsed * 9.7 + 2) * 0.15 + Math.sin(elapsed * 11.9 + 1) * 0.1 + Math.sin(elapsed * 23.3 + 2) * 0.06;
    lightRef.current.intensity = baseIntensity * ((f1 + f2 + f3) / 3);
    if (flame1Ref.current) { flame1Ref.current.scale.y = 0.7 + f1 * 0.4; flame1Ref.current.scale.x = 0.9 + f1 * 0.1; }
    if (flame2Ref.current) { flame2Ref.current.scale.y = 0.7 + f2 * 0.4; flame2Ref.current.scale.x = 0.9 + f2 * 0.1; }
    if (flame3Ref.current) { flame3Ref.current.scale.y = 0.7 + f3 * 0.4; flame3Ref.current.scale.x = 0.9 + f3 * 0.1; }
  });

  // 3 votives in a small triangle cluster
  const votives: { x: number; z: number; h: number; ref: React.RefObject<THREE.Mesh> }[] = [
    { x: 0, z: -0.06, h: 0.18, ref: flame1Ref },
    { x: 0.055, z: 0.04, h: 0.15, ref: flame2Ref },
    { x: -0.055, z: 0.04, h: 0.16, ref: flame3Ref },
  ];

  return (
    <group position={[posX, posY, posZ]}>
      {/* Main warm point light */}
      <pointLight
        ref={lightRef}
        color="#ffcc66"
        intensity={baseIntensity}
        distance={lightDistance}
        position={[0, 0.22, 0]}
        castShadow={castShadow}
        shadow-mapSize-width={castShadow ? shadowMapSize : undefined}
        shadow-mapSize-height={castShadow ? shadowMapSize : undefined}
      />

      {votives.map((v, i) => (
        <group key={i} position={[v.x, 0, v.z]}>
          {/* Glass votive holder — translucent cylinder */}
          <mesh position={[0, v.h / 2, 0]}>
            <cylinderGeometry args={[0.04, 0.035, v.h, 8, 1, true]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3 + (intensity / 100) * 1.0}
              toneMapped={false}
              transparent
              opacity={0.25}
              roughness={0.1}
              metalness={0}
              side={DoubleSide}
            />
          </mesh>
          {/* Wax body inside holder */}
          <mesh position={[0, v.h * 0.35, 0]}>
            <cylinderGeometry args={[0.032, 0.032, v.h * 0.6, 6]} />
            <meshStandardMaterial color="#f5f0e0" roughness={0.95} metalness={0} />
          </mesh>
          {/* Flame — emissive for bloom */}
          <mesh ref={v.ref} position={[0, v.h * 0.75, 0]}>
            <sphereGeometry args={[0.018, 6, 8]} />
            <meshStandardMaterial
              color="#ffdd44"
              emissive="#ffaa00"
              emissiveIntensity={5 + (intensity / 100) * 8}
              toneMapped={false}
              transparent
              opacity={0.95}
            />
          </mesh>
          {/* Inner flame core — white-hot center */}
          <mesh position={[0, v.h * 0.73, 0]}>
            <sphereGeometry args={[0.008, 4, 4]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={8}
              toneMapped={false}
              transparent
              opacity={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* Warm glow halo around the cluster */}
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial
          color="#ffcc66"
          emissive="#ffaa33"
          emissiveIntensity={0.8 + (intensity / 100) * 2}
          toneMapped={false}
          transparent
          opacity={0.06}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** Gobo beam — spotlight + patterned cone + patterned ground projection */
function GoboBeam({ color, intensity, t, lightDistance, spreadRad, mountHeight, coneHeight, coneRadius, pattern, castShadow, shadowMapSize }: {
  color: Color; intensity: number; t: number; lightDistance: number; spreadRad: number;
  mountHeight: number; coneHeight: number; coneRadius: number;
  pattern: string; castShadow: boolean; shadowMapSize: number;
}) {
  const goboMap = useMemo(() => getGoboTexture(pattern), [pattern]);

  return (
    <>
      {/* SpotLight for actual scene lighting */}
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
      {/* Visible beam cone with emissive glow */}
      <mesh position={[0, mountHeight - coneHeight / 2, 0]}>
        <coneGeometry args={[coneRadius, coneHeight, 32, 1, true]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15 + t * 0.4}
          toneMapped={false}
          transparent
          opacity={0.06 + t * 0.18}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Patterned ground projection — gobo texture as alphaMap, raised above surfaces */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
        <circleGeometry args={[coneRadius * 1.2, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5 + t * 1.5}
          toneMapped={false}
          transparent
          opacity={0.15 + t * 0.4}
          alphaMap={goboMap}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/** String light catenary — wire + bulbs draped between two anchor points */
function StringLightCatenary({ posX, posZ, baseY, color, intensity, t, spanWorld, angleRad, sagRatio, quality }: {
  posX: number; posZ: number; baseY: number; color: Color; intensity: number; t: number;
  spanWorld: number; angleRad: number; sagRatio: number; quality: { tier: string };
}) {
  const halfSpan = spanWorld / 2;
  const sag = spanWorld * sagRatio;

  // Bulb count scales with span and quality
  const bulbsPerFoot = quality.tier === "high" ? 3 : quality.tier === "medium" ? 2 : 1;
  const bulbCount = Math.max(5, Math.round(spanWorld * bulbsPerFoot));
  const curveSamples = quality.tier === "high" ? 32 : quality.tier === "medium" ? 20 : 10;
  const bulbRadius = 0.035;
  const bulbSegments = quality.tier === "high" ? 8 : quality.tier === "medium" ? 6 : 4;
  const wireRadius = 0.006;
  const wireRadialSegs = quality.tier === "high" ? 5 : 3;

  // Compute catenary points and wire geometry
  const { wireGeometry, bulbMatrices } = useMemo(() => {
    const dx = Math.cos(angleRad) * halfSpan;
    const dz = Math.sin(angleRad) * halfSpan;

    // Generate curve sample points (parabolic catenary)
    const curvePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= curveSamples; i++) {
      const p = i / curveSamples;
      const x = -dx + 2 * dx * p;
      const z = -dz + 2 * dz * p;
      const y = -4 * sag * p * (1 - p); // parabolic droop, max at midpoint
      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    // Wire tube geometry along the catenary curve
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, curveSamples * 2, wireRadius, wireRadialSegs, false);

    // Bulb positions evenly spaced along the curve
    const matrices: THREE.Matrix4[] = [];
    const tempMatrix = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();
    const tempQuat = new THREE.Quaternion();
    const tempScale = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < bulbCount; i++) {
      const p = (i + 0.5) / bulbCount; // avoid exact endpoints
      curve.getPointAt(p, tempPos);
      tempMatrix.compose(tempPos, tempQuat, tempScale);
      matrices.push(tempMatrix.clone());
    }

    return { wireGeometry: tubeGeo, bulbMatrices: matrices };
  }, [angleRad, halfSpan, sag, curveSamples, bulbCount, wireRadius, wireRadialSegs]);

  // Dispose wire geometry on unmount
  useEffect(() => {
    return () => { wireGeometry.dispose(); };
  }, [wireGeometry]);

  // Set instanced bulb transforms
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!instancedRef.current) return;
    for (let i = 0; i < bulbMatrices.length; i++) {
      instancedRef.current.setMatrixAt(i, bulbMatrices[i]);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  }, [bulbMatrices]);

  return (
    <group position={[posX, baseY, posZ]}>
      {/* Wire */}
      <mesh geometry={wireGeometry}>
        <meshStandardMaterial color="#222" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Instanced bulbs — emissive for bloom */}
      <instancedMesh ref={instancedRef} args={[undefined, undefined, bulbCount]}>
        <sphereGeometry args={[bulbRadius, bulbSegments, bulbSegments]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2 + t * 4}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </instancedMesh>

      {/* Central point light at lowest sag point */}
      <pointLight
        color={color}
        intensity={intensity * 0.5}
        distance={spanWorld * 1.5}
        position={[0, -sag, 0]}
        castShadow={false}
      />
      {/* Quarter-point fill lights on medium/high */}
      {quality.tier !== "low" && (
        <>
          <pointLight
            color={color}
            intensity={intensity * 0.2}
            distance={spanWorld}
            position={[Math.cos(angleRad) * halfSpan * 0.5, -sag * 0.75, Math.sin(angleRad) * halfSpan * 0.5]}
            castShadow={false}
          />
          <pointLight
            color={color}
            intensity={intensity * 0.2}
            distance={spanWorld}
            position={[-Math.cos(angleRad) * halfSpan * 0.5, -sag * 0.75, -Math.sin(angleRad) * halfSpan * 0.5]}
            castShadow={false}
          />
        </>
      )}

      {/* No ground glow for string lights — ambient only */}
    </group>
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
}: {
  zone: LightingZone;
  originX: number;
  originY: number;
  canvasWidth: number;
  canvasHeight: number;
  castShadow: boolean;
  furnitureObjects: ParsedObject[];
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
  const color = getCachedColor(zone.colorTemperature ? kelvinToHex(zone.colorTemperature) : zone.color);
  const mountHeight = (zone.height ?? 8);  // in feet (= world units since S = 1/12)
  const spreadRad = ((zone.spread ?? 45) * Math.PI) / 180;
  const isDownlight = DOWNLIGHT_TYPES.has(zone.type);
  const isUplight = UPLIGHT_TYPES.has(zone.type);
  const lightDistance = zone.size * S * 6;

  // Calculate surface height for furniture-snapped lights (candles, string lights, etc.)
  let snapElevation = 0;
  const needsSnap = zone.snappedToFurnitureId || zone.type === "candles";
  if (needsSnap) {
    // Try exact label match, then furnitureId match
    let snappedObj = zone.snappedToFurnitureId
      ? furnitureObjects.find((obj) => obj.label === zone.snappedToFurnitureId) ||
        furnitureObjects.find((obj) => obj.furnitureId === zone.snappedToFurnitureId)
      : null;
    // Proximity fallback: find nearest furniture to the light's position
    if (!snappedObj) {
      let bestDist = 5; // max 5 world units (~5 feet)
      for (const obj of furnitureObjects) {
        if (!obj.furnitureId || obj.type !== "furniture") continue;
        const objPosX = (obj.x - originX) * S;
        const objPosZ = (obj.y - originY) * S;
        const dist = Math.sqrt((objPosX - posX) ** 2 + (objPosZ - posZ) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          snappedObj = obj;
        }
      }
    }
    if (snappedObj) {
      const h = getHeight(snappedObj.furnitureId);
      snapElevation = h * S;  // convert inches to world units
    }
  }

  // ── Downlight spotlight types: visible beam from ceiling down ──
  if (isDownlight) {
    const coneHeight = mountHeight * 0.85;
    const coneRadius = Math.tan(spreadRad / 2) * coneHeight;
    const useEmissiveCone = quality.tier !== "low";

    const isGobo = zone.type === "gobo";
    const goboPattern = zone.goboPattern ?? "leaves";

    return (
      <group position={[posX, 0, posZ]}>
        {isGobo ? (
          /* Gobo projector — spotLight + patterned beam cone + patterned ground pool */
          <GoboBeam
            color={color}
            intensity={intensity}
            t={t}
            lightDistance={lightDistance}
            spreadRad={spreadRad}
            mountHeight={mountHeight}
            coneHeight={coneHeight}
            coneRadius={coneRadius}
            pattern={goboPattern}
            castShadow={castShadow}
            shadowMapSize={shadowMapSize}
          />
        ) : (
          <>
            {/* Raw spotLight for actual scene lighting */}
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
            {/* Visible beam cone — emissive on medium/high so bloom amplifies it */}
            <mesh position={[0, mountHeight - coneHeight / 2, 0]}>
              <coneGeometry args={[coneRadius, coneHeight, 32, 1, true]} />
              {useEmissiveCone ? (
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.2 + t * 0.5}
                  toneMapped={false}
                  transparent
                  opacity={0.06 + t * 0.22}
                  side={DoubleSide}
                  depthWrite={false}
                />
              ) : (
                <meshStandardMaterial
                  color={color}
                  transparent
                  opacity={0.06 + t * 0.22}
                  side={DoubleSide}
                  depthWrite={false}
                />
              )}
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

  // ── Uplight types: upward beam cone + wall wash ──
  if (isUplight) {
    const coneHeight = mountHeight * 1.2;
    const coneRadius = Math.tan(spreadRad / 2) * coneHeight;
    const useEmissiveCone = quality.tier !== "low";

    return (
      <group position={[posX, 0, posZ]}>
        {/* Raw spotLight aimed upward for actual lighting */}
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
        {/* Upward volumetric cone visual — emissive on medium/high so bloom amplifies it */}
        <mesh position={[0, 0.2 + coneHeight / 2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[coneRadius, coneHeight, 24, 1, true]} />
          {useEmissiveCone ? (
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.15 + t * 0.4}
              toneMapped={false}
              transparent
              opacity={0.05 + t * 0.20}
              side={DoubleSide}
              depthWrite={false}
            />
          ) : (
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.05 + t * 0.20}
              side={DoubleSide}
              depthWrite={false}
            />
          )}
        </mesh>

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

  // ── String lights: catenary wire with bulbs between two anchor points ──
  const stringBaseY = snapElevation > 0 ? snapElevation + 0.3 : mountHeight;
  // Use size for span length (apply multiplier so default 40px gives ~10ft span)
  const spanWorld = Math.max(zone.size * S * 3, 2); // minimum 2 feet
  const angleRad = ((zone.angle ?? 0) * Math.PI) / 180;
  // Spread controls sag amount (60° default = ~17% of span)
  const sagRatio = Math.max(0.05, (zone.spread ?? 60) / 360);

  return (
    <StringLightCatenary
      posX={posX}
      posZ={posZ}
      baseY={stringBaseY}
      color={color}
      intensity={intensity}
      t={t}
      spanWorld={spanWorld}
      angleRad={angleRad}
      sagRatio={sagRatio}
      quality={quality}
    />
  );
}
