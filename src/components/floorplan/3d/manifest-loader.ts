/**
 * Lazy-loads and caches the models manifest for floor plan GLTF models.
 * Only loads floorplan catalog entries.
 */

export interface ManifestEntry {
  id: string;
  name: string;
  category: string;
  catalog: string;
  complexity: string;
  filePath: string;
  fileSize: number;
  variants: Array<{
    name: string;
    color: string;
    material: string;
    productFolder: string;
  }>;
}

let floorplanManifest: Map<string, ManifestEntry> | null = null;
let fetchPromise: Promise<Map<string, ManifestEntry>> | null = null;

/**
 * Asynchronously loads the floorplan manifest, caching the result.
 * Subsequent calls return the cached Map immediately.
 */
export async function getFloorplanManifest(): Promise<Map<string, ManifestEntry>> {
  if (floorplanManifest) return floorplanManifest;

  if (!fetchPromise) {
    fetchPromise = fetch("/models-manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch manifest: ${r.status}`);
        return r.json();
      })
      .then((data: { models: Record<string, ManifestEntry> }) => {
        const map = new Map<string, ManifestEntry>();
        for (const [id, entry] of Object.entries(data.models)) {
          if (entry.catalog === "floorplan") {
            map.set(id, entry);
          }
        }
        floorplanManifest = map;
        return map;
      })
      .catch((err) => {
        console.warn("[manifest-loader] Failed to load models manifest:", err);
        // Return empty map so callers fall back to procedural
        const empty = new Map<string, ManifestEntry>();
        floorplanManifest = empty;
        fetchPromise = null; // Allow retry on next call
        return empty;
      });
  }

  return fetchPromise;
}

/**
 * Synchronously returns the cached manifest, or null if not yet loaded.
 * Call getFloorplanManifest() first to trigger the fetch.
 */
export function getFloorplanManifestSync(): Map<string, ManifestEntry> | null {
  return floorplanManifest;
}
