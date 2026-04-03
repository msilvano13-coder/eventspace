/**
 * Canvas Bridge — bidirectional adapter between LayoutObject[] and Fabric.js canvas.
 *
 * layoutObjectsToCanvasJSON(): LayoutObject[] → Fabric.js JSON (for loadFromJSON)
 * canvasToLayoutObjects(): Fabric.js canvas → LayoutObject[]
 * roomShapeFromCanvas(): Extract room polygon from canvas
 * roomShapeToCanvasJSON(): RoomShape → Fabric.js path object JSON
 */

import type { AssetDefinition, LayoutObject, RoomShape } from "@/lib/types";
import { v4 as uuid } from "uuid";

// ── LayoutObject[] → Fabric.js JSON ──

/**
 * Generate a Fabric.js-compatible JSON structure from structured layout data.
 * The output can be fed directly into canvas.loadFromJSON().
 */
export function layoutObjectsToCanvasJSON(
  objects: LayoutObject[],
  assetCatalog: Map<string, AssetDefinition>,
  canvasWidth: number,
  canvasHeight: number,
  roomShape: RoomShape | null,
): Record<string, unknown> {
  const fabricObjects: Record<string, unknown>[] = [];

  // 1. Add room shape if present
  if (roomShape) {
    fabricObjects.push(roomShapeToFabricObject(roomShape, canvasWidth, canvasHeight));
  }

  // 2. Group objects by groupId for table-set reconstruction
  const grouped = new Map<string, LayoutObject[]>();
  const ungrouped: LayoutObject[] = [];

  for (const obj of objects) {
    if (obj.groupId) {
      const list = grouped.get(obj.groupId) || [];
      list.push(obj);
      grouped.set(obj.groupId, list);
    } else {
      ungrouped.push(obj);
    }
  }

  // 3. Render ungrouped objects as individual Groups (shape + label)
  for (const obj of ungrouped) {
    const asset = assetCatalog.get(obj.assetId);
    if (!asset) continue;
    fabricObjects.push(createFabricGroup(obj, asset));
  }

  // 4. Render grouped objects as nested Groups (table-set)
  Array.from(grouped.entries()).forEach(([groupId, members]) => {
    // Find the primary item (parent, or first table)
    const primary = members.find((m: LayoutObject) => !m.parentId) || members[0];
    const children = members.filter((m: LayoutObject) => m.id !== primary.id);
    const primaryAsset = assetCatalog.get(primary.assetId);
    if (!primaryAsset) return;

    // Build sub-objects with positions relative to primary center
    const subObjects: Record<string, unknown>[] = [];

    // Primary item (table)
    subObjects.push(createFabricSubGroup(primary, primaryAsset, 0, 0, false));

    // Children (chairs) — offset relative to primary position
    for (const child of children) {
      const childAsset = assetCatalog.get(child.assetId);
      if (!childAsset) continue;
      const offsetX = child.positionX - primary.positionX;
      const offsetY = child.positionY - primary.positionY;
      const isChair = childAsset.category === "seating";
      subObjects.push(createFabricSubGroup(child, childAsset, offsetX, offsetY, isChair));
    }

    // Wrap in combined group
    fabricObjects.push({
      type: "Group",
      left: primary.positionX,
      top: primary.positionY,
      originX: "center",
      originY: "center",
      angle: primary.rotation,
      scaleX: primary.scaleX,
      scaleY: primary.scaleY,
      objects: subObjects,
      data: {
        _objectId: primary.id,
        furnitureId: primary.assetId,
        assetId: primary.assetId,
        label: primary.label,
        isTableSet: true,
        groupId,
        tableId: primary.tableId || uuid(),
      },
    });
  });

  return {
    version: "6.0.0",
    objects: fabricObjects,
    width: canvasWidth,
    height: canvasHeight,
  };
}

/** Create a Fabric.js Group JSON for a single layout object (shape + label) */
function createFabricGroup(obj: LayoutObject, asset: AssetDefinition): Record<string, unknown> {
  const width = obj.widthOverride ?? asset.defaultWidth;
  const height = obj.heightOverride ?? asset.defaultHeight;
  const fill = obj.fillOverride ?? asset.fillColor;
  const stroke = obj.strokeOverride ?? asset.strokeColor;

  const shapeObj = asset.shape === "circle"
    ? {
        type: "Circle",
        radius: asset.defaultRadius || width / 2,
        fill,
        stroke,
        strokeWidth: 1.5,
        originX: "center",
        originY: "center",
      }
    : {
        type: "Rect",
        width,
        height,
        fill,
        stroke,
        strokeWidth: 1.5,
        rx: 4,
        ry: 4,
        originX: "center",
        originY: "center",
      };

  const labelFontSize = Math.max(5, Math.min(9, Math.floor(width / 8)));
  const labelObj = {
    type: "FabricText",
    text: obj.label || asset.name,
    fontSize: labelFontSize,
    fill: "#57534e",
    originX: "center",
    originY: "center",
    fontFamily: "sans-serif",
  };

  return {
    type: "Group",
    left: obj.positionX,
    top: obj.positionY,
    originX: "center",
    originY: "center",
    angle: obj.rotation,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    objects: [shapeObj, labelObj],
    data: {
      _objectId: obj.id,
      furnitureId: obj.assetId,
      assetId: obj.assetId,
      label: obj.label || asset.name,
      tableId: obj.tableId || uuid(),
      tablescapeId: obj.tablescapeId || undefined,
    },
  };
}

/** Create a sub-group for inside a table-set (position relative to parent center) */
function createFabricSubGroup(
  obj: LayoutObject,
  asset: AssetDefinition,
  offsetX: number,
  offsetY: number,
  isChair: boolean,
): Record<string, unknown> {
  const width = obj.widthOverride ?? asset.defaultWidth;
  const height = obj.heightOverride ?? asset.defaultHeight;
  const fill = obj.fillOverride ?? asset.fillColor;
  const stroke = obj.strokeOverride ?? asset.strokeColor;

  const shapeObj = asset.shape === "circle"
    ? {
        type: "Circle",
        radius: asset.defaultRadius || width / 2,
        fill,
        stroke,
        strokeWidth: isChair ? 1 : 1.5,
        originX: "center",
        originY: "center",
      }
    : {
        type: "Rect",
        width,
        height,
        fill,
        stroke,
        strokeWidth: isChair ? 1 : 1.5,
        rx: isChair ? 3 : 4,
        ry: isChair ? 3 : 4,
        originX: "center",
        originY: "center",
      };

  const subObjects: Record<string, unknown>[] = [shapeObj];

  if (!isChair) {
    subObjects.push({
      type: "FabricText",
      text: obj.label || asset.name,
      fontSize: 9,
      fill: "#57534e",
      originX: "center",
      originY: "center",
      fontFamily: "sans-serif",
    });
  }

  return {
    type: "Group",
    left: offsetX,
    top: offsetY,
    originX: "center",
    originY: "center",
    angle: obj.rotation,
    objects: subObjects,
    data: {
      furnitureId: obj.assetId,
      assetId: obj.assetId,
      ...(isChair ? {} : { label: obj.label || asset.name, tableId: obj.tableId || uuid() }),
    },
  };
}

/** Convert RoomShape to a Fabric.js Path-like object */
function roomShapeToFabricObject(
  roomShape: RoomShape,
  canvasWidth: number,
  canvasHeight: number,
): Record<string, unknown> {
  const offsetX = Math.round((canvasWidth - roomShape.width) / 2);
  const offsetY = Math.round((canvasHeight - roomShape.height) / 2);

  // Build SVG path from points
  const pts = roomShape.points;
  let pathData = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    pathData += ` L ${pts[i][0]} ${pts[i][1]}`;
  }
  pathData += " Z";

  return {
    type: "Path",
    path: pathData,
    left: offsetX,
    top: offsetY,
    fill: "#fffdf7",
    stroke: "#b8a080",
    strokeWidth: 2,
    selectable: true,
    evented: true,
    objectCaching: false,
    data: { isRoom: true },
  };
}

// ── Fabric.js canvas → LayoutObject[] ──

/**
 * Extract LayoutObject[] from a Fabric.js canvas JSON.
 * Filters out non-content objects (grid, lighting, guides, measures, room).
 */
export function canvasToLayoutObjects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvasJSON: Record<string, any>,
  floorPlanId: string,
): LayoutObject[] {
  const objects = canvasJSON.objects || [];
  const layoutObjects: LayoutObject[] = [];
  let zIndex = 0;

  for (const obj of objects) {
    // Skip non-content objects
    if (obj.data?.isGrid || obj.data?.isRoom || obj.data?.isLighting ||
        obj.data?.isLightingOverlay || obj.data?.isGuide || obj.data?.isMeasure) {
      continue;
    }

    // Must have a furniture/asset ID
    const assetId = obj.data?.assetId || obj.data?.furnitureId;
    if (!assetId) continue;

    if (obj.data?.isTableSet && obj.type === "Group" && Array.isArray(obj.objects)) {
      // Table-set group: extract each sub-item as its own LayoutObject
      // Always generate a fresh UUID — obj.data.groupId is a template slug (e.g. "round-60-8"), not a UUID
      const groupId = obj.data._groupUUID || uuid();
      const parentLeft = obj.left || 0;
      const parentTop = obj.top || 0;
      const parentAngle = obj.angle || 0;

      // Find the primary (table) sub-object
      let primaryId: string | null = null;

      for (const sub of obj.objects) {
        const subAssetId = sub.data?.assetId || sub.data?.furnitureId;
        if (!subAssetId) continue;

        const isChair = !sub.data?.tableId;
        const objId = sub.data?._objectId || obj.data?._objectId || uuid();

        // Sub-object positions are relative to parent — convert to absolute
        const absX = parentLeft + (sub.left || 0);
        const absY = parentTop + (sub.top || 0);

        const layoutObj: LayoutObject = {
          id: isChair ? uuid() : objId,
          floorPlanId,
          assetId: subAssetId,
          positionX: absX,
          positionY: absY,
          rotation: isChair ? (sub.angle || 0) : parentAngle,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          widthOverride: null,
          heightOverride: null,
          label: sub.data?.label || "",
          groupId,
          parentId: isChair ? primaryId : null,
          tableId: sub.data?.tableId || (isChair ? null : obj.data?.tableId) || null,
          fillOverride: null,
          strokeOverride: null,
          tablescapeId: obj.data?.tablescapeId || null,
          metadata: {},
          zIndex: zIndex++,
        };

        if (!isChair) primaryId = layoutObj.id;
        layoutObjects.push(layoutObj);
      }
    } else {
      // Single furniture item
      layoutObjects.push({
        id: obj.data?._objectId || uuid(),
        floorPlanId,
        assetId,
        positionX: obj.left || 0,
        positionY: obj.top || 0,
        rotation: obj.angle || 0,
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1,
        widthOverride: null,
        heightOverride: null,
        label: obj.data?.label || "",
        groupId: null,
        parentId: null,
        tableId: obj.data?.tableId || null,
        fillOverride: null,
        strokeOverride: null,
        tablescapeId: obj.data?.tablescapeId || null,
        metadata: {},
        zIndex: zIndex++,
      });
    }
  }

  return layoutObjects;
}

// ── Room shape extraction ──

/**
 * Extract the room shape from a Fabric.js canvas JSON.
 * Looks for the object with data.isRoom = true.
 */
export function roomShapeFromCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvasJSON: Record<string, any>,
): RoomShape | null {
  const objects = canvasJSON.objects || [];
  const roomObj = objects.find((o: any) => o.data?.isRoom);
  if (!roomObj) return null;

  // Extract points from Path data or from stored points
  if (roomObj.path) {
    // Parse SVG path commands back to points
    const points: number[][] = [];
    const pathStr = typeof roomObj.path === "string" ? roomObj.path : "";
    const commands = pathStr.match(/[ML]\s*[\d.]+\s*[\d.]+/g) || [];
    for (const cmd of commands) {
      const nums = cmd.match(/[\d.]+/g);
      if (nums && nums.length >= 2) {
        points.push([parseFloat(nums[0]), parseFloat(nums[1])]);
      }
    }
    if (points.length >= 3) {
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      return {
        points,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }
  }

  // Fallback: rect from width/height
  if (roomObj.width && roomObj.height) {
    const w = (roomObj.width || 600) * (roomObj.scaleX || 1);
    const h = (roomObj.height || 400) * (roomObj.scaleY || 1);
    return {
      points: [[0, 0], [w, 0], [w, h], [0, h]],
      width: w,
      height: h,
    };
  }

  return null;
}
