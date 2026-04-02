# 3D Asset Polish — Freelancer Handoff Document

## Project Overview

We're building **EventSpace**, a web-based event planning app. Planners use it to design floor plans and table settings in 3D. We need a library of polished 3D rental items (chairs, tables, glassware, linens, etc.) from a real rental company's catalog.

We've already generated **379 base meshes** using AI (Rodin/Hyper3D) from product photos. These models have the right shapes and proportions but need professional polish to look production-quality in a web viewer.

---

## What's In This Package

| Item | Description |
|------|-------------|
| `README.txt` | Quick-start overview |
| `3d-asset-brief.md` | Full technical specification (READ THIS FIRST) |
| `model-index.csv` | Spreadsheet of all 407 models with metadata |
| `HANDOFF.md` | This document |
| `floorplan/` | 229 models — bars, chairs, furniture, lighting, staging, tables |
| `tablescape/` | 178 models — chargers, china, flatware, glassware, linens, serving pieces |

Each model folder contains:
- `{name}.glb` — AI-generated mesh (your starting point)
- `preview.webp` — Rodin's preview render
- `reference/` — Product photos from the rental company website (the "ground truth" for what the final model should look like)

28 models are missing GLBs (we ran out of AI credits). These are marked **MISSING** in `model-index.csv`. Reference photos are still included — these would need to be modeled from scratch or we can provide GLBs later.

---

## Scope of Work Per Model

### 1. Geometry Cleanup
- Fix any topology issues, floating vertices, non-manifold edges
- Cap any holes, merge duplicate vertices
- Retopologize if the mesh is too dense or has bad flow
- Ensure clean quads/tris (no n-gons)

### 2. Hit Poly Budget Targets

| Complexity | Triangle Target | Examples |
|-----------|----------------|----------|
| **Simple** | 500 – 2,000 | Flatware, chargers, plates, napkins, glasses |
| **Medium** | 2,000 – 8,000 | Chairs, tables, bars, serving pieces |
| **Complex** | 8,000 – 15,000 | Lounge collections, DJ booths, stages |

The `model-index.csv` has the complexity tier for each model.

### 3. UV Mapping & Textures
- Clean UV unwrap
- PBR textures: Base Color, Metallic, Roughness, Normal
- Max texture size: **1024x1024** per map (512x512 preferred for simple items)
- Textures must be **embedded** in the GLB (not external files)

### 4. Material Slot Setup (CRITICAL)

Our app swaps materials at runtime for color variants (e.g., one chair model in 11 colors). You **must** use these exact material slot names:

| Slot Name | Use For |
|-----------|---------|
| `mat_primary` | Main body (the surface that changes color most often) |
| `mat_secondary` | Secondary surface (cushion on a chair, accent panel) |
| `mat_metal` | Metal parts (legs, frames, hardware, handles) |
| `mat_fabric` | Upholstery, cushions, linen surfaces |
| `mat_glass` | Glass, crystal, acrylic surfaces |
| `mat_wood` | Wood grain surfaces |
| `mat_accent` | Decorative trim, piping, beading, edges |

Not every model needs all slots — use what's appropriate. A simple glass charger might only have `mat_glass` and `mat_accent`. A chair might have `mat_wood`, `mat_fabric`, and `mat_metal`.

### 5. Export Settings
- **Format:** GLB (binary glTF)
- **Orientation:** Y-up
- **Position:** Centered at origin, bottom sitting on Y=0
- **Scale:** Real-world meters (a dinner plate ~0.27m diameter, a chair ~0.9m tall)
- **Naming:** Keep the same filename as provided

---

## Category-Specific Notes

### Charger & Set Plates
- Flat circular/rectangular items — keep geometry simple
- Focus on edge detail (beading, scalloped rims, hammered texture)
- Most are 12-14" diameter

### China & Dishware
- Bowls need proper concave interior
- Stacking clearance: slight rim overhang
- Ramekins are tiny (2-4" diameter)

### Flatware
- Very thin geometry — be careful with normals
- 5-piece set orientation: lay flat, evenly spaced
- Handle detail matters (hammered, brushed, ornate)

### Glassware
- Transparent materials (glass shader with IOR ~1.5)
- Stem and base detail important
- Wine vs. water vs. cocktail glass shapes are distinct

### Linens
- Tablecloths should drape naturally (not stiff/flat)
- Napkins: folded presentation style
- Runners: slight fabric wave/drape
- Fabric weave visible in normal map

### Chairs
- Seat and back cushion as separate `mat_fabric` mesh
- Leg/frame as `mat_wood` or `mat_metal`
- Chiavari chairs are the highest priority

### Tables
- Tabletop and legs as separate material slots
- Round tables: 60" (5ft) and 72" (6ft) standard sizes
- Rectangular: 6ft and 8ft standard

### Bars & Back Bars
- Front panel is the hero surface (often different material)
- Countertop as separate material
- Some have LED/acrylic panels — use `mat_glass`

### Furniture (Lounge)
- Sofas, loveseats, ottomans, side tables
- Cushions should look plush (subdivision + normal map)
- Tufting detail via normal map, not geometry

### Lighting
- Marquee letters: face should emit (emissive material)
- Keep bulb geometry simple (just emissive spheres)
- Letters should be readable and properly shaped

### Stages & Flooring
- Modular panels — keep edges clean for tiling
- Dance floors: reflective surface material
- Carpet: fabric texture with subtle pile in normal map

### Room Dividers
- Drape panels: fabric physics look (gentle folds)
- Stanchions: simple metal post + rope/belt
- Hedge walls: foliage texture, not individual leaves

---

## Priority Batches

If quoting per-batch or delivering incrementally:

| Batch | Category | Count | Priority |
|-------|----------|-------|----------|
| 1 | tablescape/charger-set-plates | 26 | Highest |
| 2 | tablescape/china-dishware | 34 | High |
| 3 | tablescape/glassware | 11 | High |
| 4 | tablescape/flatware | 17 | High |
| 5 | floorplan/chairs | 20 | High |
| 6 | floorplan/tables | 30 | Medium |
| 7 | floorplan/bars-back-bars | 37 | Medium |
| 8 | floorplan/furniture | 47 | Medium |
| 9 | tablescape/linens | 47 | Medium |
| 10 | tablescape/serving-pieces | 43 | Lower |
| 11 | floorplan/lighting | 28 | Lower |
| 12 | floorplan/stages-flooring | 39 | Lower |
| 13 | floorplan/room-dividers-stanchions | 28 | Lower |

---

## Delivery Format

Please return polished models using the **exact same folder structure and filenames**. This allows us to do a direct drop-in replacement.

```
floorplan/
  chairs/
    chiavari-ballroom-chair/
      chiavari-ballroom-chair.glb    <-- your polished version
    ghost-chair/
      ghost-chair.glb
tablescape/
  glassware/
    debutante-goblet/
      debutante-goblet.glb
```

---

## Quality Checklist (Per Model)

Before delivery, each model should pass:

- [ ] Triangle count within budget for its complexity tier
- [ ] Clean topology (no non-manifold, no floating verts)
- [ ] Proper UV unwrap (no stretching, no overlaps)
- [ ] PBR textures embedded in GLB (base color, metallic, roughness, normal)
- [ ] Textures max 1024x1024
- [ ] Material slots named correctly (mat_primary, mat_metal, etc.)
- [ ] Y-up orientation
- [ ] Centered at origin, bottom at Y=0
- [ ] Real-world scale in meters
- [ ] Looks like the reference photos
- [ ] Loads cleanly in https://gltf-viewer.donmccurdy.com/

---

## Technical Context

These models will be rendered in a web browser using:
- **Three.js r170** with `GLTFLoader`
- **React Three Fiber** (React wrapper for Three.js)
- **PBR rendering** with environment lighting

The app swaps material colors/textures at runtime via the named material slots. This is why consistent slot naming is essential — our code looks up `mat_primary` by name and overrides its color.

Typical viewing distance is "tabletop" (close-up for tablescape items) and "room overview" (10-30ft for floorplan items). Tablescape items need more surface detail; floorplan items can be simpler.

---

## Questions / Contact

If anything is unclear about a specific model, check:
1. The reference photos in the model's `reference/` folder
2. The specs in `3d-asset-brief.md`
3. Reach out to us directly

Thank you!
