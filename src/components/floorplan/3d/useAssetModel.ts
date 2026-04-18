"use client";

import { useState, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useQuality } from "../QualityTier";
import { getFloorplanManifest, getFloorplanManifestSync, type ManifestEntry } from "./manifest-loader";

const CDN_URL = process.env.NEXT_PUBLIC_MODELS_CDN_URL || "/models";

interface AssetModelResult {
  scene: THREE.Group | null;
  loading: boolean;
  useProcedural: boolean;
}

/**
 * Hook that loads a GLTF model for a given furniture ID.
 *
 * - Returns `useProcedural: true` if quality tier disables GLTF,
 *   if no model exists in the manifest for this ID, or if loading fails.
 * - Clones the scene so multiple instances don't share geometry state.
 */
export function useAssetModel(furnitureId: string): AssetModelResult {
  const quality = useQuality();
  const [manifest, setManifest] = useState<Map<string, ManifestEntry> | null>(
    getFloorplanManifestSync
  );

  // Trigger manifest fetch on mount if not cached yet
  useEffect(() => {
    if (!manifest) {
      getFloorplanManifest().then(setManifest);
    }
  }, [manifest]);

  // Quality gate: if GLTF is disabled, skip entirely
  if (!quality.useGLTF) {
    return { scene: null, loading: false, useProcedural: true };
  }

  // Manifest not loaded yet — show procedural while we wait
  if (!manifest) {
    return { scene: null, loading: true, useProcedural: true };
  }

  const entry = manifest.get(furnitureId);
  if (!entry) {
    return { scene: null, loading: false, useProcedural: true };
  }

  const url = `${CDN_URL}/${entry.filePath}`;
  return { scene: null, loading: false, useProcedural: false, url, entry } as never;
}

// ─────────────────────────────────────────────────────────
// The actual GLTF loading must happen inside a component
// (useGLTF suspends). We split into a separate inner hook
// that is ONLY called when we know the model URL.
// ─────────────────────────────────────────────────────────

/**
 * Resolves the model URL for a furniture ID, or null if procedural should be used.
 * This is a non-suspending lookup — use it to decide whether to render
 * the GLTF branch or the procedural branch.
 */
export function useAssetModelUrl(furnitureId: string): {
  url: string | null;
  useProcedural: boolean;
} {
  const quality = useQuality();
  const [manifest, setManifest] = useState<Map<string, ManifestEntry> | null>(
    getFloorplanManifestSync
  );

  useEffect(() => {
    if (!manifest) {
      getFloorplanManifest().then(setManifest);
    }
  }, [manifest]);

  if (!quality.useGLTF || !manifest) {
    return { url: null, useProcedural: true };
  }

  const entry = manifest.get(furnitureId);
  if (!entry) {
    return { url: null, useProcedural: true };
  }

  return { url: `${CDN_URL}/${entry.filePath}`, useProcedural: false };
}

/**
 * Resolves the raw product-render URL (.webp) for a furniture ID.
 * Independent of the GLTF quality gate — works even when GLTF is disabled,
 * so low-tier devices and GLTF-less assets can still use a billboard impostor
 * instead of falling through to bare procedural geometry.
 *
 * Returns null if no manifest entry exists for this ID.
 */
export function useAssetRenderUrl(furnitureId: string): string | null {
  const [manifest, setManifest] = useState<Map<string, ManifestEntry> | null>(
    getFloorplanManifestSync
  );

  useEffect(() => {
    if (!manifest) {
      getFloorplanManifest().then(setManifest);
    }
  }, [manifest]);

  if (!manifest) return null;
  const entry = manifest.get(furnitureId);
  if (!entry) return null;
  return `${CDN_URL}/${entry.filePath.replace(/\.glb$/i, ".webp")}`;
}

/**
 * Loads and clones a GLTF scene from a URL.
 * Must be called inside a Suspense boundary (useGLTF suspends).
 */
export function useGLTFCloned(url: string): THREE.Group {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return cloned;
}
