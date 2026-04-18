"use client";

import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { useThree } from "@react-three/fiber";

export type QualityTier = "low" | "medium" | "high";

export interface QualitySettings {
  tier: QualityTier;
  /** Device pixel ratio range [min, max] */
  dpr: [number, number];
  /** Environment map cubemap face size */
  envMapSize: number;
  /** ContactShadows resolution */
  shadowResolution: number;
  /** Whether to use meshPhysicalMaterial for clearcoat surfaces */
  useClearcoat: boolean;
  /** Cylinder segments for round objects */
  cylinderSegments: number;
  /** Shadow map size for directional lights */
  shadowMapSize: number;
  /** Whether to use canvas-generated textures (Phase 2) */
  useTextures: boolean;
  /** Texture resolution for canvas textures */
  textureSize: number;
  /** Whether to use RoundedBox bevels (Phase 4) */
  useBevels: boolean;
  /** Whether to load GLTF models (Phase 5) */
  useGLTF: boolean;
  /** Whether to enable post-processing effects (SSAO, vignette) */
  usePostProcessing: boolean;
  /** Whether to render contact shadows */
  useContactShadows: boolean;
  /** Whether to render reflective floor overlays (MeshReflectorMaterial) */
  useReflections: boolean;
  /** Whether to render fog */
  useFog: boolean;
  /** Whether to render shadow maps on directional/spot lights */
  useShadowMaps: boolean;
  /** Whether to render candle meshes (glass, wax, flames) vs bare point light */
  useCandleMeshes: boolean;
  /** Whether to render gobo projections */
  useGobos: boolean;
  /** Whether to render tablescape GLTF items on tables */
  useTablescapes: boolean;
  /** Whether to use full lighting rig (fill, rim, hemisphere) vs minimal */
  useFullLighting: boolean;
  /** Texture anisotropy level */
  anisotropy: number;
}

const TIER_SETTINGS: Record<QualityTier, QualitySettings> = {
  low: {
    tier: "low",
    dpr: [1, 1],
    envMapSize: 64,
    shadowResolution: 256,
    useClearcoat: false,
    cylinderSegments: 8,
    shadowMapSize: 512,
    useTextures: false,
    textureSize: 0,
    useBevels: false,
    useGLTF: false,
    usePostProcessing: false,
    useContactShadows: false,
    useReflections: false,
    useFog: false,
    useShadowMaps: false,
    useCandleMeshes: false,
    useGobos: false,
    useTablescapes: false,
    useFullLighting: false,
    anisotropy: 1,
  },
  medium: {
    tier: "medium",
    dpr: [1, 1.5],
    envMapSize: 128,
    shadowResolution: 512,
    useClearcoat: true,
    cylinderSegments: 24,
    shadowMapSize: 2048,
    useTextures: true,
    textureSize: 128,
    useBevels: true,
    useGLTF: true,
    usePostProcessing: true,
    useContactShadows: true,
    useReflections: true,
    useFog: true,
    useShadowMaps: true,
    useCandleMeshes: true,
    useGobos: true,
    useTablescapes: true,
    useFullLighting: true,
    anisotropy: 8,
  },
  high: {
    tier: "high",
    dpr: [1, 2],
    envMapSize: 256,
    shadowResolution: 1024,
    useClearcoat: true,
    cylinderSegments: 32,
    shadowMapSize: 2048,
    useTextures: true,
    textureSize: 256,
    useBevels: true,
    useGLTF: true,
    usePostProcessing: true,
    useContactShadows: true,
    useReflections: true,
    useFog: true,
    useShadowMaps: true,
    useCandleMeshes: true,
    useGobos: true,
    useTablescapes: true,
    useFullLighting: true,
    anisotropy: 8,
  },
};

const QualityContext = createContext<QualitySettings>(TIER_SETTINGS.medium);

export function useQuality(): QualitySettings {
  return useContext(QualityContext);
}

/**
 * Detects the device quality tier based on GPU info, memory, and device type.
 * Must be called inside R3F Canvas (uses useThree).
 */
function QualityDetector({ onDetected }: { onDetected: (tier: QualityTier) => void }) {
  const { gl } = useThree();

  useEffect(() => {
    try {
      const canvas = gl.domElement;
      const webglCtx = canvas.getContext("webgl2") || canvas.getContext("webgl");
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      const memoryGB = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;

      let tier: QualityTier = "medium";

      if (isMobile || memoryGB <= 2) {
        tier = "low";
      } else if (webglCtx) {
        const debugInfo = webglCtx.getExtension("WEBGL_debug_renderer_info");
        const renderer = debugInfo
          ? webglCtx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string
          : "";
        const maxTexSize = webglCtx.getParameter(webglCtx.MAX_TEXTURE_SIZE) as number;

        if (maxTexSize <= 4096 || renderer.includes("Intel")) {
          tier = "medium";
        } else {
          tier = "high";
        }
      }

      onDetected(tier);
    } catch {
      // If detection fails, default to medium
      onDetected("medium");
    }
  }, [gl, onDetected]);

  return null;
}

/**
 * Provides quality settings to all child components inside the R3F Canvas.
 * Must be placed inside <Canvas>.
 *
 * @param overrideTier - If set to "low", "medium", or "high", bypasses auto-detection.
 *                       "auto" (default) uses GPU-based detection.
 */
export function QualityProvider({ children, overrideTier }: { children: ReactNode; overrideTier?: "auto" | "low" | "medium" | "high" }) {
  const [detectedTier, setDetectedTier] = useState<QualityTier>("medium");
  const effectiveTier = overrideTier && overrideTier !== "auto" ? overrideTier : detectedTier;
  const settings = useMemo(() => TIER_SETTINGS[effectiveTier], [effectiveTier]);

  return (
    <QualityContext.Provider value={settings}>
      {/* Always run detector so we have a baseline, even if overridden */}
      <QualityDetector onDetected={setDetectedTier} />
      {children}
    </QualityContext.Provider>
  );
}

export { TIER_SETTINGS };
