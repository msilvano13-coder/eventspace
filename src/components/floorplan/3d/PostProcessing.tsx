"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useQuality } from "../QualityTier";
import {
  EffectComposer as PMEffectComposer,
  BloomEffect,
  VignetteEffect,
  EffectPass,
  RenderPass,
  BlendFunction,
} from "postprocessing";

/** Post-processing effects — bloom for glow + vignette for polish (imperative API) */
function PostProcessingImpl({ mood }: { mood: string }) {
  const { gl, scene, camera, size } = useThree();
  const quality = useQuality();
  const composerRef = useRef<PMEffectComposer | null>(null);

  useEffect(() => {
    if (!quality.usePostProcessing) return;

    const isDramatic = mood === "dramatic";
    const isHigh = quality.tier === "high";

    const composer = new PMEffectComposer(gl, { frameBufferType: undefined });
    composer.addPass(new RenderPass(scene, camera));

    try {
      const bloom = new BloomEffect({
        intensity: isDramatic ? 0.9 : isHigh ? 0.6 : 0.4,
        luminanceThreshold: 0.8,
        luminanceSmoothing: 0.4,
        mipmapBlur: true,
        radius: 0.7,
      });

      const vignette = new VignetteEffect({
        offset: isDramatic ? 0.35 : 0.45,
        darkness: isDramatic ? 0.6 : 0.35,
        blendFunction: BlendFunction.NORMAL,
      });

      composer.addPass(new EffectPass(camera, bloom, vignette));
    } catch (e) {
      console.warn("[PostProcessing] Effects creation failed:", e);
    }

    composer.setSize(size.width, size.height);
    composerRef.current = composer;

    return () => {
      composer.dispose();
      composerRef.current = null;
    };
  }, [gl, scene, camera, size, mood, quality.usePostProcessing, quality.tier]);

  // Update size on resize
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size]);

  useFrame((_state, delta) => {
    if (composerRef.current) {
      composerRef.current.render(delta);
    }
  }, 1); // priority 1 = runs after default render

  return null;
}

export function PostProcessingEffects({ mood }: { mood: string }) {
  const quality = useQuality();
  if (!quality.usePostProcessing) return null;
  return (
    <PostProcessingErrorBoundary>
      <Suspense fallback={null}>
        <PostProcessingImpl mood={mood} />
      </Suspense>
    </PostProcessingErrorBoundary>
  );
}

/** Silently swallows post-processing errors — renders the scene without effects */
class PostProcessingErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn("[PostProcessing] Effects disabled due to error:", error.message);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
