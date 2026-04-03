# Phase 3: 3D Rendering Upgrade -- Handoff

## What Was Delivered

| Deliverable | Status | Notes |
|---|---|---|
| **3a: Fix broken 3D features** | Done | Post-processing (SSAO + Vignette) re-enabled with error boundary fallback. Labels switched to canvas-texture sprites to bypass CSP font issues. |
| **3b: GLTF model loading pipeline** | Done (partial) | `manifest-loader` + `useAssetModel` hook + `GLTFFurniture` renderer + error boundary fallback to procedural. Quality-gated (medium/high only). Instanced rendering for 200+ chairs deferred. LOD system deferred. |
| **3c: Chunk models manifest** | Done | Manifest loader filters to `catalog === "floorplan"` entries only. Full category-chunked splitting not yet implemented. |
| **3d: Real texture support** | Scrapped | `floor-textures.ts` (755 lines of procedural canvas textures) was written but is unused. Solid PBR materials with tuned roughness/metalness/envMapIntensity used instead. Real PBR texture files were never created. |
| **3e: Camera + polish** | Done | Walkthrough mode (WASD + mouse-drag), spring-damped camera transitions, presentation auto-rotate, FPS counter (dev only). |
| **3f: Split FloorPlan3DView.tsx** | Done | Original monolith split into 12 focused modules in `src/components/floorplan/3d/`. |
| **Settings panel** | Done | Full UI for venue, chair, linen, floor, wall, lighting, camera, quality, labels, shadows. |
| **Quality tier system** | Done | Auto-detection via GPU/memory/device heuristics. Manual override (low/medium/high). Gates GLTF, post-processing, clearcoat, cylinder segments, shadow resolution. |
| **Wall rendering** | Done | 5-layer walls: baseboard, wainscoting, chair rail, upper wall, crown molding. Customizable wall color with auto-derived trim shades. |
| **Floor reflections** | Done | `MeshReflectorMaterial` for marble, hardwood, tile. Per-material mirror/blur/mixStrength config. Carpet and concrete use standard non-reflective material. |
| **PBR material system** | Done | Per-furniture-type roughness, metalness, envMapIntensity, clearcoat. 20+ furniture types mapped. Color cache with bounded eviction (max 200). |

## Architecture

Phase 3 decomposed the original `FloorPlan3DView.tsx` monolith (2,500+ lines) into a clean module tree:

```
FloorPlan3DView.tsx (orchestrator, 394 lines)
  |-- Canvas + QualityProvider
  |     |-- QualityTier.tsx (auto-detection, context provider)
  |     |-- FloorPlan3DScene (inner scene component)
  |           |-- ProceduralEnvMap (mood-driven environment map)
  |           |-- VenueEnvironment (tent/barn/garden/etc. presets)
  |           |-- RoomFloor (floor + walls per room polygon)
  |           |-- FurnitureRenderer (per-category 3D geometry)
  |           |     |-- useAssetModel / GLTFFurniture (GLTF branch)
  |           |     |-- Procedural geometry (fallback branch)
  |           |-- LightingSystem (zone lights, candle flicker)
  |           |-- CameraSystem (presets, walkthrough, animator)
  |           |-- PostProcessing (SSAO + vignette)
  |-- Settings3DPanel (overlay UI, outside Canvas)
```

**Data flow:** `floorPlanJSON` string -> `parseCanvasJSON()` -> array of `ParsedObject` (rooms + furniture) -> each rendered by its respective module. Settings flow down as `View3DSettings` prop. Quality flows via React context (`useQuality()`).

**Key patterns:**
- Error boundaries at every crash-prone boundary (GLTF loading, post-processing)
- Quality gating via context -- components check `useQuality()` to decide feature level
- Memoized geometry (shapes, wall segments, bounding boxes) to avoid per-frame allocation
- Bounded color cache (`MAX_COLOR_CACHE = 200`) to prevent memory leaks
- Spring-damped animation (stiffness=4, damping=5) instead of linear lerp

## File Map

| File | Responsibility | Lines |
|---|---|---|
| `constants.ts` | Types (`View3DSettings`, `ParsedObject`, `PBRProps`, `CameraPreset`, `FurnitureCategory`), scale constants, material/color lookup tables, furniture heights, PBR properties, color cache utilities | 332 |
| `FurnitureRenderer.tsx` | Per-category 3D geometry rendering (round tables, rect tables, chairs in 4 styles, sofas, bars, stages, arches, draping, etc.), GLTF model integration, floating labels via canvas-texture sprites, interactive hover state | 1246 |
| `floor-textures.ts` | Procedural canvas-generated textures (hardwood, marble, carpet, concrete, tile). **Currently unused** -- dead code candidate. | 755 |
| `CameraSystem.tsx` | `WalkthroughControls` (WASD + mouse-drag, wall collision), `CameraAnimator` (spring-damped transitions, presentation auto-rotate), `FPSCounter` (dev only) | 488 |
| `Settings3DPanel.tsx` | Gear-button overlay panel with controls for all settings: venue preset, chair style + color, linen color + custom, floor material + color, wall color, lighting mood + color cast slider, camera preset, quality override, label/shadow toggles | 342 |
| `LightingSystem.tsx` | `LightingZone3D` -- renders user-placed lighting zones as point/spot/cone lights with candle flicker animation, shadow capping (`MAX_SHADOW_LIGHTS = 4`) | 296 |
| `parse-canvas.ts` | Parses Fabric.js canvas JSON into `ParsedObject[]`, extracts room polygons and furniture positions/dimensions | 211 |
| `RoomFloor.tsx` | Floor rendering from room polygon shape, `MeshReflectorMaterial` for polished surfaces, 5-layer wall system (baseboard through crown molding) | 208 |
| `GLTFFurniture.tsx` | `GLTFErrorBoundary` (catches load failures, returns null for procedural fallback), `GLTFFurnitureInner` (suspense-based GLTF loading), `GLTFFurniture` (scales model to match furniture bounding box, applies color override to `mat_primary` slot) | 135 |
| `useAssetModel.ts` | `useAssetModelUrl()` -- non-suspending manifest lookup to decide GLTF vs procedural. `useGLTFCloned()` -- suspending hook that loads + clones GLTF scene. Quality-gated: returns `useProcedural: true` when tier disables GLTF. | 102 |
| `manifest-loader.ts` | Lazy-loads `/models-manifest.json`, filters to `catalog === "floorplan"`, caches in module-level `Map<string, ManifestEntry>`. Async + sync accessors. Returns empty map on failure (graceful degradation). | 67 |
| `PostProcessing.tsx` | `EffectComposer` with SSAO (20-32 samples) + Vignette, quality-gated via `usePostProcessing`. `PostProcessingErrorBoundary` silently disables effects on GPU errors. | 55 |
| `index.ts` | Barrel exports for all modules | 31 |

**Related files outside `3d/`:**

| File | Responsibility | Lines |
|---|---|---|
| `QualityTier.tsx` | `QualityProvider` (context), `QualityDetector` (GPU heuristics), tier settings definitions | 148 |
| `FloorPlan3DView.tsx` | Top-level orchestrator: Canvas setup, scene composition, settings state, camera framing, WebGL context loss handling, cleanup on unmount | 394 |

## Key Systems

### Quality Tier System

**Auto-detection** (runs inside Canvas via `useThree`):
- Checks `navigator.userAgent` for mobile -> low
- Checks `navigator.deviceMemory` <= 2GB -> low
- Checks `WEBGL_debug_renderer_info` for Intel GPU -> medium
- Checks `MAX_TEXTURE_SIZE` <= 4096 -> medium
- Otherwise -> high

**Override mechanism:** `Settings3DPanel` exposes Auto / Low / Medium / High buttons. The `qualityOverride` field in `View3DSettings` is passed to `QualityProvider`. When set to anything other than `"auto"`, it bypasses detection.

**What each tier gates:**

| Feature | Low | Medium | High |
|---|---|---|---|
| DPR | 1 | 1-1.5 | 1-2 |
| GLTF models | Off | On | On |
| Post-processing (SSAO) | Off | On | On |
| Clearcoat materials | Off | On | On |
| Cylinder segments | 16 | 24 | 32 |
| Shadow map size | 1024 | 2048 | 2048 |
| Canvas textures | Off | On (128px) | On (256px) |
| Bevels (RoundedBox) | Off | On | On |
| Env map size | 64 | 128 | 256 |
| Contact shadow res | 256 | 512 | 1024 |

### GLTF Model Pipeline

```
manifest-loader.ts          Fetches /models-manifest.json, filters to floorplan catalog,
                            caches in module-level Map. Graceful fallback to empty map.
        |
        v
useAssetModel.ts            useAssetModelUrl(furnitureId) does non-suspending lookup:
                            1. Check quality.useGLTF -- if false, return useProcedural: true
                            2. Check manifest for furnitureId -- if missing, useProcedural: true
                            3. Return CDN URL: ${NEXT_PUBLIC_MODELS_CDN_URL}/${entry.filePath}
        |
        v
GLTFFurniture.tsx           GLTFErrorBoundary wraps Suspense boundary.
                            GLTFFurnitureInner calls useGLTFCloned(url) which:
                              - useGLTF(url) suspends until loaded
                              - scene.clone(true) to avoid shared geometry state
                            GLTFFurniture scales model to match furniture bounding box,
                            applies color override to mat_primary material slot.
        |
        v
FurnitureRenderer.tsx       FurnitureMesh checks useAssetModelUrl(). If useProcedural is
                            false, renders GLTF branch inside Suspense + error boundary.
                            If true (or on error), renders procedural geometry.
```

**Important:** Polished GLB files are pending from freelancer. 379 base meshes were AI-generated but need manual cleanup. The pipeline is fully wired -- once GLBs are dropped into `/models/` and the manifest is updated, they render automatically.

### Camera System

**Presets** (selected via Settings panel or programmatic `cameraPreset`):
- **Default** -- no animation, orbit controls active
- **Bird's Eye** -- directly above room, looking down
- **Eye Level** -- 5'6" eye height, offset from center, looking at room
- **Presentation** -- angled overview, auto-rotates at 0.1 rad/sec after 3s of no interaction. User interaction pauses rotation; it resumes after 3s delay.
- **Walkthrough** -- first-person WASD + mouse-drag. Disables orbit controls entirely.

**Spring animation:** Camera transitions use spring-damped interpolation (stiffness=4, damping=5) applied per-frame. Both camera position and orbit controls target are animated. Animation completes when distance < 0.02 units and velocity < 0.01 units/sec. Delta is clamped to 0.05s to prevent instability on tab-switch or lag spikes.

**Walkthrough wall collision:** Room polygon edges are converted to `WallSegment[]`. On each frame, the desired WASD movement is tested against all wall segments using 2D line-segment intersection. If the path crosses a wall or is within `WALL_BUFFER = 0.3` units, movement is projected onto the wall tangent (sliding) and the position is pushed away from the wall along its normal. The camera starts inside the room (offset slightly from center) to avoid spawning outside walls.

### Floor Materials

Five material types with tuned PBR properties:

| Material | Color | Roughness | Metalness | EnvMap | Reflection |
|---|---|---|---|---|---|
| Hardwood | #c4a06e | 0.55 | 0.02 | 0.4 | Mirror 0.08, blur [800,400] |
| Marble | #ede6d8 | 0.08 | 0.08 | 0.8 | Mirror 0.25, blur [400,200] |
| Carpet | #9a8b7a | 0.98 | 0.0 | 0.01 | None (standard material) |
| Concrete | #b0b0b0 | 0.82 | 0.01 | 0.08 | None (standard material) |
| Tile | #f2ede5 | 0.25 | 0.04 | 0.5 | Mirror 0.15, blur [500,250] |

**MeshReflectorMaterial** from `@react-three/drei` is used for polished surfaces (hardwood, marble, tile). It renders a reflection plane at floor level using a bounding-rect approximation of the room polygon. Carpet and concrete use standard `meshStandardMaterial` with an extruded shape matching the exact room polygon.

**Why procedural textures were scrapped:** `floor-textures.ts` (755 lines) generates canvas-based normal/roughness maps for each material type. However, `MeshReflectorMaterial` does not support custom texture maps -- it only accepts scalar PBR properties (color, roughness, metalness). Since reflective floors are the primary visual feature, procedural textures were abandoned in favor of solid materials with carefully tuned PBR values. The file still exists but is not imported by `RoomFloor.tsx`.

### Post-Processing

Two effects in `EffectComposer` (multisampling disabled, normal pass enabled):

- **SSAO** -- 20 samples / 5 rings (normal), 32 samples / 6 rings (dramatic mood). Radius 0.5, intensity 22-35. World-distance thresholds prevent artifacts on distant geometry.
- **Vignette** -- offset 0.45, darkness 0.35 (normal); offset 0.35, darkness 0.6 (dramatic).

**Quality-gated:** Only renders when `quality.usePostProcessing === true` (medium and high tiers). Returns `null` on low tier.

**Error boundary:** `PostProcessingErrorBoundary` catches WebGL errors from incompatible GPUs. On error, it logs a warning and renders nothing -- the scene displays without effects rather than crashing.

### Settings Panel

Gear-button overlay in top-right corner. Scrollable panel (max 80vh) with these control groups:

| Control | Type | Options |
|---|---|---|
| Venue | Pill buttons | Default, Indoor Ballroom, Tent, Outdoor Garden, Rooftop, Barn, Beach |
| Chair Style | Pill buttons | Solid Back, Chiavari, Folding, Ghost |
| Chair Color | Color picker + Reset | Nullable (null = default gold/wood) |
| Match Seat to Linen | Checkbox | When checked, seat cushion uses linen color |
| Linen Color | Pill buttons with swatches | Ivory, White, Blush, Navy, Sage, Gold |
| Linen Custom Color | Color picker + Reset | Overrides preset linen color |
| Floor Material | Pill buttons | Hardwood, Marble, Carpet, Concrete, Tile |
| Floor Color | Color picker + Reset | Overrides default material color |
| Wall Color | Color picker + Reset | Nullable (null = warm neutral #f5f0e8) |
| Lighting Mood | Pill buttons | Warm, Cool, Neutral, Dramatic |
| Lighting Color Cast | Range slider 0-100% | 0% = neutral white, 100% = full mood color |
| Camera | Pill buttons | Default, Bird's Eye, Eye Level, Presentation, Walk Through |
| Quality | Pill buttons | Auto, Low, Medium, High |
| Labels | Toggle switch | Show/hide floating furniture labels |
| Shadows | Toggle switch | Enable/disable shadow casting + contact shadows |

Venue preset selection auto-applies matching floor material and lighting mood from `VENUE_PRESETS`.

## What's NOT Done

- **Polished GLB asset library** -- 379 base meshes were AI-generated and sent to a freelancer for cleanup. The loading pipeline is fully wired and will render them once the files are placed in `/models/` with a matching manifest.
- **Real PBR texture files** -- No tileable albedo/normal/roughness maps exist. Solid materials with tuned PBR scalars are used instead. Procedural canvas textures were built (`floor-textures.ts`, 755 lines) but scrapped because `MeshReflectorMaterial` does not support texture maps.
- **Instanced rendering for 200+ chairs** -- Each chair is a separate mesh. For events with 200+ chairs, this will cause frame drops. `<Instances>` from drei should be used to batch identical geometry (deferred to Phase 4).
- **LOD system** -- No distance-based level of detail. All furniture renders at full quality regardless of camera distance. Planned tiers: high-poly < 5m, low-poly 5-20m, procedural > 20m (deferred).
- **Category-chunked manifest** -- The manifest loader filters by catalog but loads the full JSON. Splitting into per-category manifests would reduce initial payload (currently ~172KB total).

## Dependencies

| Package | Version | Role |
|---|---|---|
| `three` | ^0.170.0 | Core 3D engine |
| `@react-three/fiber` | ^8.17.14 | React renderer for Three.js |
| `@react-three/drei` | ^9.121.5 | Helpers: OrbitControls, ContactShadows, MeshReflectorMaterial, useGLTF, Html, RoundedBox |
| `@react-three/postprocessing` | ^3.0.4 | SSAO, Vignette, EffectComposer |
| `postprocessing` | ^6.39.0 | Underlying post-processing library (BlendFunction) |
| `next` | 14.2.35 | Framework (SSR, routing, public dir for models) |
| `react` / `react-dom` | ^18 | UI framework |

## Known Issues / Gotchas

1. **`initialSettings` must be spread with `DEFAULT_SETTINGS`** -- `FloorPlan3DView` does `{ ...DEFAULT_SETTINGS, ...(props.initialSettings ?? {}) }`. If a caller passes a partial `View3DSettings` missing new fields added in Phase 3, the spread ensures defaults fill in. Without this, undefined values would break controls.

2. **PostProcessing can crash on certain GPUs** -- `PostProcessingErrorBoundary` catches this and renders nothing. The scene still works, just without SSAO/vignette. A console warning is logged.

3. **MeshReflectorMaterial does not support texture maps** -- It only takes scalar `roughness`/`metalness`/`color` props. This is why `floor-textures.ts` procedural textures are unused by `RoomFloor.tsx`, even though the barrel export still exposes them.

4. **`floor-textures.ts` is dead code** -- 755 lines exported from `index.ts` but not imported by any rendering code. `RoomFloor.tsx` uses scalar PBR values from `FLOOR_MATERIALS` in `constants.ts`. Safe to remove.

5. **Walkthrough camera starts inside the room** -- Intentional. Starting outside the polygon would immediately trigger wall collision resolution, potentially locking the camera against a wall. The initial position is offset slightly from center (`span * 0.15`, max 2 units) to avoid being dead-center.

6. **`useAssetModel.ts` has a conditional hook call** -- The `useAssetModel()` function checks `quality.useGLTF` before calling hooks, which technically violates React's rules of hooks. The exported `useAssetModelUrl()` is the safe alternative used by `FurnitureRenderer.tsx`. `useAssetModel()` is not called anywhere and may be a dead code candidate.

7. **Color cache eviction is FIFO** -- `colorCache` evicts the oldest entry when it hits 200. In practice this is fine, but a layout with 200+ unique colors would cause cache thrashing. The cache is cleared on unmount.

8. **Spring animation delta is clamped to 50ms** -- Both `CameraAnimator` and `WalkthroughControls` cap `delta` at 0.05s. Without this, switching browser tabs and returning causes a large delta spike that launches the camera.

9. **Shadow-casting lights capped at 4** -- `MAX_SHADOW_LIGHTS = 4` in constants. Lighting zones beyond index 3 render lights but without shadow maps. This is a GPU protection measure.

10. **WebGL context loss handling** -- `FloorPlan3DView` listens for `webglcontextlost` and calls `e.preventDefault()`. R3F handles re-render on `webglcontextrestored`. Without `preventDefault()`, the canvas goes permanently black.

## What's Next (Phase 4)

Phase 4 focuses on **Performance + Scale** to handle larger events (500+ objects):

- **4a: Spatial indexing** -- Replace O(n^2) brute-force collision/alignment with grid hash. Needed now that 304 asset types enable denser layouts.
- **4b: Command history deltas** -- Replace full-canvas JSON snapshots in undo/redo with surgical delta-based storage. GLTF model references inflate snapshot size.
- **4c: Paginated fetchers** -- Fix `.limit(500)` silent truncation. A 600-person wedding currently drops 100 guests with no error.
- **4d: Non-atomic replace fix** -- Wrap delete-all-then-insert operations in transactions to prevent data loss on interruption.
- **4e: Monolithic RPC optimization** -- Split `get_client_event` (14 subqueries) into lazy-loaded chunks matching the tab-based UI.

Exit criteria: No O(n^2) in hot paths, no silent truncation, no non-atomic replaces, client RPC under 200ms.
