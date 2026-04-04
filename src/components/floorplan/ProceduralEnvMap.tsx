"use client";

import { Environment } from "@react-three/drei";
import { useQuality } from "./QualityTier";

/**
 * Environment map for the 3D scene.
 * - Medium/High quality: Real HDRI from ambientCG (indoor venue)
 * - Low quality: Flat preset (no HDRI load)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ProceduralEnvMap({ mood }: { mood: string }) {
  const quality = useQuality();

  // Low quality: skip environment map entirely — the drei presets fetch from
  // an external CDN which fails on mobile Safari. Solid-color materials still
  // look fine without env reflections at low quality.
  if (quality.tier === "low") {
    return null;
  }

  // Medium/High: real HDRI for photorealistic reflections (served locally)
  return (
    <Environment
      files="/textures/env/venue.exr"
      background={false}
    />
  );
}
