"use client";

import React, { useMemo, useCallback, useEffect, useState, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, MeshReflectorMaterial } from "@react-three/drei";
import { ACESFilmicToneMapping, PCFSoftShadowMap } from "three";
import { LightingZone, Tablescape } from "@/lib/types";
import { ErrorBoundary } from "./FloorPlan3DErrorBoundary";
import VenueEnvironment, { VenuePresetDef, VENUE_PRESETS } from "./VenueEnvironment";
import ProceduralEnvMap from "./ProceduralEnvMap";
import { QualityProvider } from "./QualityTier";

import {
  S,
  FLOOR_MATERIALS,
  LIGHTING_MOODS,
  MAX_SHADOW_LIGHTS,
  DEFAULT_SETTINGS,
  colorCache,
  blendToNeutral,
  type View3DSettings,
} from "./3d/constants";
import { parseCanvasJSON } from "./3d/parse-canvas";
import { FurnitureMesh, InteractiveFurniture, labelTextureCache } from "./3d/FurnitureRenderer";
import { RoomFloor } from "./3d/RoomFloor";
import { LightingZone3D } from "./3d/LightingSystem";
import { WalkthroughControls, CameraAnimator, FPSCounter, type WallSegment } from "./3d/CameraSystem";
import { PostProcessingEffects } from "./3d/PostProcessing";
import { Settings3DPanel } from "./3d/Settings3DPanel";

// ── Main component ──

interface FloorPlan3DViewProps {
  floorPlanJSON: string | null;
  lightingZones: LightingZone[];
  lightingEnabled: boolean;
  tablescapes?: Tablescape[];
  presentationMode?: boolean;
  initialSettings?: View3DSettings | null;
  onSettingsChange?: (settings: View3DSettings) => void;
}

function FloorPlan3DScene({
  floorPlanJSON,
  lightingZones,
  lightingEnabled,
  tablescapes,
  centerX: cx,
  centerZ: cz,
  settings,
}: FloorPlan3DViewProps & { centerX: number; centerZ: number; settings: View3DSettings }) {
  const { objects, canvasWidth, canvasHeight } = useMemo(
    () => parseCanvasJSON(floorPlanJSON),
    [floorPlanJSON]
  );

  const originX = canvasWidth / 2;
  const originY = canvasHeight / 2;
  const maxDim = Math.max(canvasWidth, canvasHeight) * S;

  const rooms = useMemo(() => objects.filter((o) => o.type === "room"), [objects]);
  const furniture = useMemo(() => objects.filter((o) => o.type === "furniture"), [objects]);

  // Compute actual room bounding box so venue elements fit the room, not the canvas
  const roomBounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    let hasRoom = false;
    for (const room of rooms) {
      if (!room.points || room.points.length < 3) continue;
      hasRoom = true;
      for (const [px, py] of room.points) {
        const wx = (px - originX) * S;
        const wz = (py - originY) * S;
        minX = Math.min(minX, wx);
        maxX = Math.max(maxX, wx);
        minZ = Math.min(minZ, wz);
        maxZ = Math.max(maxZ, wz);
      }
    }
    if (!hasRoom) return { cx, cz, span: maxDim };
    const roomCx = (minX + maxX) / 2;
    const roomCz = (minZ + maxZ) / 2;
    const roomSpan = Math.max(maxX - minX, maxZ - minZ);
    return { cx: roomCx, cz: roomCz, span: roomSpan };
  }, [rooms, originX, originY, cx, cz, maxDim]);

  // Compute wall segments from all rooms for walkthrough collision detection
  const wallSegments = useMemo<WallSegment[]>(() => {
    const segs: WallSegment[] = [];
    for (const room of rooms) {
      if (!room.points || room.points.length < 3) continue;
      const pts = room.points.map(([x, y]) => ({
        x: (x - originX) * S,
        z: (y - originY) * S,
      }));
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        segs.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z });
      }
    }
    return segs;
  }, [rooms, originX, originY]);

  // Ref for OrbitControls so CameraAnimator can interpolate its target
  const orbitControlsRef = useRef<any>(null);

  // Resolve venue preset
  const activePreset: VenuePresetDef | null = settings.venuePreset !== "none"
    ? VENUE_PRESETS[settings.venuePreset]
    : null;
  const baseFloor = FLOOR_MATERIALS[settings.floorMaterial];
  const effectiveFloor = activePreset?.floorOverride ?? (settings.floorColor ? { ...baseFloor, color: settings.floorColor } : baseFloor);
  const fogColor = activePreset?.fogColor ?? "#f0ece6";
  const showWalls = activePreset?.showWalls ?? true;

  return (
    <>
      {/* Procedural environment map — gives PBR materials something to reflect */}
      <ProceduralEnvMap mood={settings.lightingMood} />

      {/* Fog for depth — tighter for indoor venues, looser for outdoor */}
      <fog attach="fog" args={[
        fogColor,
        activePreset?.showWalls ? maxDim * 1.5 : maxDim * 2.5,
        activePreset?.showWalls ? maxDim * 3.5 : maxDim * 6,
      ]} />

      {/* Scene lighting — mood-driven key + fill, color cast blended toward neutral */}
      {/* roomDimmer (0–1) scales ambient scene lights when lighting mode is active */}
      {(() => {
        const mood = LIGHTING_MOODS[settings.lightingMood];
        const dim = lightingEnabled ? 0.25 : 1;
        return (
          <>
            <ambientLight
              intensity={lightingEnabled ? mood.ambientIntensity * 0.4 * dim : mood.ambientIntensity}
              color={blendToNeutral(mood.ambientColor, settings.lightingColorCast)}
            />
            {/* Key light — directional from upper-right */}
            <directionalLight
              position={[cx + maxDim * 0.4, maxDim * 0.6, cz + maxDim * 0.3]}
              intensity={lightingEnabled ? mood.keyIntensity * 0.4 * dim : mood.keyIntensity}
              color={blendToNeutral(mood.keyColor, settings.lightingColorCast)}
              castShadow={settings.showShadows}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-left={-maxDim}
              shadow-camera-right={maxDim}
              shadow-camera-top={maxDim}
              shadow-camera-bottom={-maxDim}
              shadow-bias={-0.0002}
              shadow-normalBias={0.02}
            />
            {/* Fill light — from opposite side, dims when user lighting takes over */}
            <directionalLight
              position={[cx - maxDim * 0.3, maxDim * 0.4, cz - maxDim * 0.3]}
              intensity={lightingEnabled ? mood.fillIntensity * 0.3 * dim : mood.fillIntensity}
              color={blendToNeutral(mood.fillColor, settings.lightingColorCast)}
            />
            {/* Rim light for edge separation — softer when user lighting is on */}
            <directionalLight
              position={[cx, maxDim * 0.3, cz - maxDim * 0.5]}
              intensity={lightingEnabled ? 0.06 * dim : 0.12}
              color={blendToNeutral("#f0ece6", settings.lightingColorCast)}
            />
            {/* Bounce light from below — simulates floor reflection */}
            <hemisphereLight
              args={[blendToNeutral("#faf7f0", settings.lightingColorCast), blendToNeutral("#d4c8b8", settings.lightingColorCast), lightingEnabled ? 0.08 * dim : 0.15]}
            />
          </>
        );
      })()}

      {/* Ground plane (fallback if no room) — reflective for marble/hardwood, flat for carpet/concrete */}
      {rooms.length === 0 && (
        effectiveFloor.roughness < 0.5 ? (
          <mesh key={`ground-reflect-${effectiveFloor.color}`} rotation={[-Math.PI / 2, 0, 0]} position={[roomBounds.cx, -0.01, roomBounds.cz]} receiveShadow>
            <planeGeometry args={[roomBounds.span * 1.5, roomBounds.span * 1.5]} />
            <MeshReflectorMaterial
              mirror={0.35}
              blur={[300, 100]}
              resolution={512}
              mixBlur={1}
              mixStrength={0.6}
              roughness={effectiveFloor.roughness}
              metalness={effectiveFloor.metalness}
              color={effectiveFloor.color}
              depthScale={0}
            />
          </mesh>
        ) : (
          <mesh key={`ground-${effectiveFloor.color}`} rotation={[-Math.PI / 2, 0, 0]} position={[roomBounds.cx, -0.01, roomBounds.cz]} receiveShadow>
            <planeGeometry args={[roomBounds.span * 1.5, roomBounds.span * 1.5]} />
            <meshStandardMaterial color={effectiveFloor.color} roughness={effectiveFloor.roughness} metalness={effectiveFloor.metalness} envMapIntensity={(effectiveFloor as { envMapIntensity?: number }).envMapIntensity ?? 0.3} />
          </mesh>
        )
      )}

      {/* Contact shadows — sized to room, mood-tinted */}
      {settings.showShadows && (
        <ContactShadows
          position={[roomBounds.cx, -0.005, roomBounds.cz]}
          opacity={settings.lightingMood === "dramatic" ? 0.45 : 0.35}
          scale={roomBounds.span * 1.5}
          blur={5}
          far={roomBounds.span}
          resolution={512}
          color={settings.lightingMood === "warm" ? "#6b5e4e" : settings.lightingMood === "cool" ? "#5a6070" : settings.lightingMood === "dramatic" ? "#3a3028" : "#6a6a6a"}
        />
      )}

      {/* Venue environment elements (tent, grass, string lights, beams, etc.) — sized to room */}
      <VenueEnvironment preset={activePreset} cx={roomBounds.cx} cz={roomBounds.cz} maxDim={roomBounds.span} />

      {/* Room floor */}
      {rooms.map((room, i) => (
        <RoomFloor key={`room-${i}`} obj={room} originX={originX} originY={originY} settings={settings} showWalls={showWalls} floorOverride={activePreset?.floorOverride} />
      ))}

      {/* Furniture */}
      {furniture.map((obj, i) => (
        <InteractiveFurniture key={`f-${i}`} enabled>
          <FurnitureMesh obj={obj} originX={originX} originY={originY} settings={settings} tablescapes={tablescapes} />
        </InteractiveFurniture>
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
            furnitureObjects={furniture}
          />
        ))}

      {/* Infinite-feel ground plane — dark neutral surface fading to environment */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[roomBounds.cx, -0.02, roomBounds.cz]} receiveShadow>
        <planeGeometry args={[roomBounds.span * 4, roomBounds.span * 4]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.95}
          metalness={0}
          envMapIntensity={0.05}
        />
      </mesh>

      {settings.cameraPreset === "walkthrough" ? (
        <WalkthroughControls cx={cx} cz={cz} span={roomBounds.span} wallSegments={wallSegments} />
      ) : (
        <>
          <OrbitControls
            ref={orbitControlsRef}
            makeDefault
            enablePan
            enableZoom
            enableRotate
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.7}
            zoomSpeed={0.8}
            panSpeed={0.6}
            target={[cx, 0, cz]}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={1}
            maxDistance={maxDim * 3}
          />
          {/* Smooth camera transitions between presets */}
          <CameraAnimator preset={settings.cameraPreset} cx={cx} cz={cz} span={roomBounds.span} orbitControlsRef={orbitControlsRef} />
        </>
      )}

      {/* FPS counter — dev mode only */}
      <FPSCounter />

      {/* Post-processing — SSAO for depth + vignette for polish, quality-gated */}
      <PostProcessingEffects mood={settings.lightingMood} />
    </>
  );
}

export default function FloorPlan3DView(props: FloorPlan3DViewProps) {
  const { floorPlanJSON } = props;
  const [settings, setSettings] = useState<View3DSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...(props.initialSettings ?? {}),
  }));
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingsChange = useCallback((newSettings: View3DSettings) => {
    setSettings(newSettings);
    props.onSettingsChange?.(newSettings);
  }, [props.onSettingsChange]);

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

  const glRef = useRef<any>(null);

  const handleCreated = useCallback((state: any) => {
    const renderer = state.gl;
    glRef.current = renderer;

    // Enable soft shadows on high-quality tier
    if (settings.qualityOverride === "high" || (!settings.qualityOverride || settings.qualityOverride === "auto")) {
      renderer.shadowMap.type = PCFSoftShadowMap;
      renderer.shadowMap.needsUpdate = true;
    }

    // Set initial exposure
    renderer.toneMappingExposure = settings.exposure ?? 1.1;

    // Handle WebGL context loss gracefully
    const canvas = renderer.domElement;
    canvas.addEventListener("webglcontextlost", (e: Event) => {
      e.preventDefault();
    });
    canvas.addEventListener("webglcontextrestored", () => {
      // R3F will re-render automatically
    });
  }, [settings.qualityOverride, settings.exposure]);

  // Keep exposure in sync when the slider moves
  useEffect(() => {
    if (glRef.current) {
      glRef.current.toneMappingExposure = settings.exposure ?? 1.1;
    }
  }, [settings.exposure]);

  // Clear caches and dispose GPU resources when the 3D view unmounts
  useEffect(() => {
    return () => {
      colorCache.clear();

      // Dispose label texture cache
      labelTextureCache.forEach((tex) => tex.dispose());
      labelTextureCache.clear();
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="w-full h-full bg-gradient-to-b from-stone-200 to-stone-300 relative">
        <Canvas
          shadows
          camera={camConfig}
          dpr={[1, 2]}
          onCreated={handleCreated}
          gl={{
            antialias: true,
            powerPreference: "default",
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
        >
          <QualityProvider overrideTier={settings.qualityOverride}>
            <Suspense fallback={null}>
              <FloorPlan3DScene {...props} centerX={centerX} centerZ={centerZ} settings={settings} />
            </Suspense>
          </QualityProvider>
        </Canvas>
        {!props.presentationMode && (
          <Settings3DPanel
            settings={settings}
            onChange={handleSettingsChange}
            open={showSettings}
            onToggle={() => setShowSettings(!showSettings)}
          />
        )}
        {settings.cameraPreset === "walkthrough" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none">
            WASD to move &middot; Click + drag to look around
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
