/**
 * GLTF Model Registry for Venue Environment Elements
 *
 * Same pattern as furniture-models.ts — procedural fallback when no .glb exists.
 * Drop a .glb into public/models/venue/ and add one line here to swap out geometry.
 */

export interface VenueModelDef {
  path: string;
  scale?: number;
  rotationY?: number;
}

export const VENUE_MODELS: Record<string, VenueModelDef> = {
  // Uncomment when model files are added:
  // "tent-canopy": { path: "/models/venue/tent-canopy.glb" },
  // "tent-pole":   { path: "/models/venue/tent-pole.glb" },
  // "string-lights": { path: "/models/venue/string-lights.glb" },
  // "exposed-beam":  { path: "/models/venue/exposed-beam.glb" },
  // "low-railing":   { path: "/models/venue/low-railing.glb" },
  // "chandelier":    { path: "/models/venue/chandelier.glb" },
  // "tree":          { path: "/models/venue/tree.glb" },
};

export function hasVenueModel(elementId: string): boolean {
  return elementId in VENUE_MODELS;
}

export function getVenueModelDef(elementId: string): VenueModelDef | null {
  return VENUE_MODELS[elementId] ?? null;
}
