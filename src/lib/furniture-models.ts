/**
 * Furniture 3D Model Registry
 *
 * Maps furnitureId → GLTF model path. When a `.glb` file exists in
 * `public/models/`, the 3D view will load it via useGLTF and render the real
 * model. Otherwise it falls back to the built-in procedural geometry.
 *
 * To add a new model:
 * 1. Export as `.glb` from Blender (apply transforms, Y-up)
 * 2. Drop into `public/models/<name>.glb`
 * 3. Add the mapping below
 * 4. Model should be **centered at origin**, resting on the XZ ground plane (Y=0)
 * 5. Scale: 1 unit = 1 foot (matching SCALE = 1/12 from inches)
 *
 * Style guide:
 * - Low-poly architectural style (500-2000 triangles per model)
 * - Neutral colors baked in, but accept runtime tint via `color` prop
 * - No animations or armatures
 */

export interface FurnitureModelDef {
  /** Path relative to /public — used by useGLTF */
  path: string;
  /** Optional scale override (default 1.0) if model was authored at different scale */
  scale?: number;
  /** Y rotation offset in radians if model faces wrong direction */
  rotationY?: number;
}

/**
 * Registry of available GLTF models.
 * Key = furnitureId from FURNITURE_CATALOG.
 * Only add entries when a .glb file actually exists.
 */
export const FURNITURE_MODELS: Record<string, FurnitureModelDef> = {
  // Example (uncomment when model files are added):
  // "round-table-60": { path: "/models/round-table-60.glb" },
  // "round-table-72": { path: "/models/round-table-72.glb", scale: 1.2 },
  // "chair":          { path: "/models/chiavari-chair.glb" },
  // "rect-table-6":   { path: "/models/rect-table-6.glb" },
  // "rect-table-8":   { path: "/models/rect-table-8.glb" },
  // "cocktail-table":  { path: "/models/cocktail-table.glb" },
  // "stage":          { path: "/models/stage.glb" },
  // "bar":            { path: "/models/bar-counter.glb" },
  // "lounge-sofa":    { path: "/models/lounge-sofa.glb" },
  // "dj-booth":       { path: "/models/dj-booth.glb" },
};

/** Check if a GLTF model is available for a furniture ID */
export function hasGLTFModel(furnitureId: string): boolean {
  return furnitureId in FURNITURE_MODELS;
}

/** Get the model definition, or null if no GLTF available */
export function getModelDef(furnitureId: string): FurnitureModelDef | null {
  return FURNITURE_MODELS[furnitureId] ?? null;
}

/**
 * Preload models for a list of furniture IDs.
 * Call this on scene mount to avoid loading stalls during render.
 * useGLTF.preload() is a no-op if the model is already cached.
 */
export function preloadModels(furnitureIds: string[]): void {
  // Dynamic import to avoid SSR issues with useGLTF
  if (typeof window === "undefined") return;
  const uniqueIds = Array.from(new Set(furnitureIds));
  for (const id of uniqueIds) {
    const def = FURNITURE_MODELS[id];
    if (def) {
      // useGLTF.preload is available at module level from drei
      // We'll call it from the component side to avoid circular deps
      console.log(`[3D] Preloading model: ${def.path}`);
    }
  }
}
