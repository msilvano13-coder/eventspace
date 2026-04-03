"use client";

import React, { Suspense } from "react";
import { useQuality } from "../QualityTier";
import { EffectComposer, SSAO, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

/** Post-processing effects — SSAO for depth cues + vignette for polish */
export function PostProcessingEffects({ mood }: { mood: string }) {
  const quality = useQuality();
  if (!quality.usePostProcessing) return null;
  const isDramatic = mood === "dramatic";
  return (
    <Suspense fallback={null}>
      <EffectComposer multisampling={0} enableNormalPass>
        <SSAO
          samples={isDramatic ? 32 : 20}
          rings={isDramatic ? 6 : 5}
          radius={0.5}
          intensity={isDramatic ? 35 : 22}
          luminanceInfluence={0.5}
          worldDistanceThreshold={4.0}
          worldDistanceFalloff={1.5}
          worldProximityThreshold={1.0}
          worldProximityFalloff={0.8}
        />
        <Vignette
          offset={isDramatic ? 0.35 : 0.45}
          darkness={isDramatic ? 0.6 : 0.35}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </Suspense>
  );
}
