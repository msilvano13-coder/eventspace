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

  // Low quality: use a minimal preset to avoid loading the HDRI
  if (quality.tier === "low") {
    return <Environment preset="apartment" background={false} />;
  }

  // Medium/High: real HDRI for photorealistic reflections
  return (
    <Environment
      files="/textures/env/venue.exr"
      background={false}
    />
  );
}
