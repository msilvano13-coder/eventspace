"use client";

import { useState, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";

// ── Types ──

export interface AssetModel {
  id: string;
  name: string;
  category: string;
  catalog: string;
  complexity: string;
  filePath: string;
  fileSize: number;
  variants: {
    name: string;
    color: string;
    material: string;
    productFolder: string;
  }[];
}

interface ModelsManifest {
  version: number;
  totalModels: number;
  models: Record<string, AssetModel>;
  categories: Record<string, { count: number; catalog: string }>;
}

// ── Singleton manifest cache ──

let manifestCache: ModelsManifest | null = null;
let manifestPromise: Promise<ModelsManifest> | null = null;

async function loadManifest(): Promise<ModelsManifest> {
  if (manifestCache) return manifestCache;
  if (manifestPromise) return manifestPromise;
  manifestPromise = fetch("/models-manifest.json")
    .then((r) => r.json())
    .then((data) => {
      manifestCache = data;
      return data;
    });
  return manifestPromise;
}

// ── Hooks ──

export function useModelsManifest() {
  const [manifest, setManifest] = useState<ModelsManifest | null>(manifestCache);
  const [loading, setLoading] = useState(!manifestCache);

  useEffect(() => {
    if (manifestCache) {
      setManifest(manifestCache);
      setLoading(false);
      return;
    }
    loadManifest()
      .then((m) => {
        setManifest(m);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getAsset = useMemo(() => {
    if (!manifest) return () => undefined;
    return (slug: string) => manifest.models[slug];
  }, [manifest]);

  const getAssetsByCategory = useMemo(() => {
    if (!manifest) return () => [] as AssetModel[];
    return (category: string) =>
      Object.values(manifest.models).filter((m) => m.category === category);
  }, [manifest]);

  const getAssetsByCatalog = useMemo(() => {
    if (!manifest) return () => [] as AssetModel[];
    return (catalog: string) =>
      Object.values(manifest.models).filter((m) => m.catalog === catalog);
  }, [manifest]);

  return { manifest, loading, getAsset, getAssetsByCategory, getAssetsByCatalog };
}

/**
 * Base URL for model assets. Uses Supabase Storage CDN in production,
 * falls back to local /models/ in development.
 */
const MODELS_BASE_URL = process.env.NEXT_PUBLIC_MODELS_CDN_URL || "/models";

/**
 * Build the URL path for a GLB asset.
 */
export function getAssetGLBPath(asset: AssetModel): string {
  return `${MODELS_BASE_URL}/${asset.filePath}`;
}

/**
 * Build the URL path for a model's preview thumbnail.
 */
export function getAssetThumbnailPath(asset: AssetModel): string {
  return `${MODELS_BASE_URL}/${asset.filePath.replace(".glb", ".webp")}`;
}

/**
 * Preload a GLB so it's cached for instant display.
 */
export function preloadAsset(asset: AssetModel): void {
  useGLTF.preload(getAssetGLBPath(asset));
}

// ── Category display helpers ──

export const TABLESCAPE_CATEGORIES = [
  { id: "charger-set-plates", label: "Chargers & Plates" },
  { id: "china-dishware", label: "China & Dishware" },
  { id: "flatware", label: "Flatware" },
  { id: "glassware", label: "Glassware" },
  { id: "linens", label: "Linens" },
  { id: "serving-pieces", label: "Serving Pieces" },
] as const;
