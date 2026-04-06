import { unwrapCanvasJSON } from "@/lib/floorplan-schema";
import { FURNITURE_CATALOG } from "@/lib/constants";
import type { ParsedObject } from "./constants";

/** Parse Fabric.js canvas JSON into 3D-renderable objects */
export function parseCanvasJSON(floorPlanJSON: string | null): {
  objects: ParsedObject[];
  canvasWidth: number;
  canvasHeight: number;
} {
  if (!floorPlanJSON) return { objects: [], canvasWidth: 800, canvasHeight: 600 };

  const canvasJSON = unwrapCanvasJSON(floorPlanJSON);
  const fabricObjects = (canvasJSON as any).objects || [];
  const parsed: ParsedObject[] = [];

  /**
   * Recursively process Fabric.js objects into 3D-renderable ParsedObjects.
   *
   * Coordinate system notes (Fabric.js v6 with originX/Y: "center"):
   * - Group left/top = center position on canvas (or parent)
   * - Children left/top = relative to group center
   * - absX/absY accumulates through nesting: parent center + child offset * parent scale
   */
  function processObject(
    obj: any,
    parentX = 0,
    parentY = 0,
    parentAngle = 0,
    parentScaleX = 1,
    parentScaleY = 1,
    inTableSet = false,
    tableSetFurnitureId?: string,
    tableCenter?: { x: number; y: number },
    parentTablescapeId?: string,
  ) {
    const data = obj.data;
    // Apply parent scale AND rotation to child positions within groups
    const localX = (obj.left || 0) * parentScaleX;
    const localY = (obj.top || 0) * parentScaleY;
    const parentRad = (parentAngle * Math.PI) / 180;
    const cosP = Math.cos(parentRad);
    const sinP = Math.sin(parentRad);
    const absX = parentX + localX * cosP - localY * sinP;
    const absY = parentY + localX * sinP + localY * cosP;
    const absAngle = parentAngle + (obj.angle || 0);
    // Compound scale: parent scale * own scale
    const ownScaleX = (obj.scaleX || 1) * parentScaleX;
    const ownScaleY = (obj.scaleY || 1) * parentScaleY;

    // Table set groups or plain groups: recurse into children
    // Fabric.js v6 serializes type as "Group" (capital G)
    const objType = (obj.type || "").toLowerCase();
    if (objType === "group" && Array.isArray(obj.objects)) {
      // If this is a table set, recurse into sub-objects to render each piece
      if (data?.isTableSet) {
        const center = { x: absX, y: absY };
        const groupTablescapeId = data.tablescapeId || parentTablescapeId;
        for (const child of obj.objects) {
          processObject(child, absX, absY, absAngle, ownScaleX, ownScaleY, true, data.furnitureId, center, groupTablescapeId);
        }
        return;
      }

      // Individual furniture item (group = shape + label) — has furnitureId
      if (data?.furnitureId) {
        const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
        const shape = catalogItem?.shape || "rect";
        // Prefer catalog dimensions over group bounding box (group bbox includes text label)
        const w = (catalogItem?.defaultWidth || obj.width || 40) * ownScaleX;
        const h = (catalogItem?.defaultHeight || obj.height || 40) * ownScaleY;
        const r = catalogItem?.defaultRadius ? catalogItem.defaultRadius * ownScaleX : undefined;

        parsed.push({
          type: "furniture",
          furnitureId: data.furnitureId,
          label: data.label || data.furnitureId,
          shape,
          x: absX,
          y: absY,
          width: w,
          height: h,
          radius: r,
          angle: absAngle,
          fill: catalogItem?.fill || obj.fill || "#f5f0e8",
          stroke: catalogItem?.stroke || obj.stroke || "#c4b5a0",
          inTableSet,
          tableSetFurnitureId,
          tableCenter,
          tablescapeId: data.tablescapeId || parentTablescapeId || undefined,
          tableId: data.tableId || undefined,
        });
        return;
      }

      // Unknown group without data — recurse to find nested items
      for (const child of obj.objects) {
        processObject(child, absX, absY, absAngle, ownScaleX, ownScaleY);
      }
      return;
    }

    // Bare shape (no data) — if inside a table set, skip it (the tagged furniture
    // items in the group are already handled above; bare shapes are just 2D visuals).
    // Only infer furniture from bare shapes at the top level.
    if (!data) {
      if (inTableSet) return;
      const shapeType = (obj.type || "").toLowerCase();
      if (shapeType === "circle" || shapeType === "rect" || shapeType === "rectangle") {
        const w = (obj.width || 20) * ownScaleX;
        const h = (obj.height || 20) * ownScaleY;
        const r = obj.radius ? obj.radius * ownScaleX : undefined;
        const isSmallItem = w <= 20 && h <= 20;
        const inferredId = isSmallItem ? "chair" : (shapeType === "circle" ? "round-table-60" : "rect-table-6");
        parsed.push({
          type: "furniture",
          furnitureId: inferredId,
          label: "",
          shape: shapeType === "circle" ? "circle" : "rect",
          x: absX,
          y: absY,
          width: w,
          height: h,
          radius: r,
          angle: absAngle,
          fill: obj.fill || "#f5f0e8",
          stroke: obj.stroke || "#c4b5a0",
        });
      }
      return;
    }
    if (data.isGrid || data.isLighting || data.isLightingOverlay || data.isGuide) return;

    if (data.isRoom) {
      // Room shapes come in two formats:
      // 1. Polygon (from applyRoomPreset): has .points array of {x, y}
      // 2. Path (from layoutObjectsToCanvasJSON): has .path as SVG string or array
      let points: { x: number; y: number }[] = obj.points || [];

      // Parse Path SVG data when .points is missing (Path-based room shapes)
      if (points.length < 3 && obj.path) {
        let pathStr = "";
        if (typeof obj.path === "string") {
          pathStr = obj.path;
        } else if (Array.isArray(obj.path)) {
          // Fabric.js v6 serializes path as array of arrays: [["M",0,0],["L",100,0],...]
          pathStr = obj.path.map((cmd: any[]) => cmd.join(" ")).join(" ");
        }
        const commands = pathStr.match(/[ML]\s*[\d.-]+\s*[\d.-]+/g) || [];
        points = commands.map((cmd: string) => {
          const nums = cmd.match(/[\d.-]+/g)!;
          return { x: parseFloat(nums[0]), y: parseFloat(nums[1]) };
        });
      }

      if (points.length < 3) return;

      // Fabric.js Polygon (originX:"left") stores left/top as the bounding-box edge.
      // pathOffset = center of the points bounding box (not serialized, recomputed here).
      const pxs = points.map((p: any) => p.x as number);
      const pys = points.map((p: any) => p.y as number);
      const pathOffsetX = (Math.min(...pxs) + Math.max(...pxs)) / 2;
      const pathOffsetY = (Math.min(...pys) + Math.max(...pys)) / 2;

      const objWidth = obj.width || 0;
      const objHeight = obj.height || 0;

      // Center of the polygon on canvas:
      //   centerX = left + (width * scaleX) / 2   (for originX:"left")
      const centerX = absX + (objWidth * ownScaleX) / 2;
      const centerY = absY + (objHeight * ownScaleY) / 2;

      // Convert every point to absolute canvas coordinates
      const absPoints = points.map((p: any) => [
        centerX + (p.x - pathOffsetX) * ownScaleX,
        centerY + (p.y - pathOffsetY) * ownScaleY,
      ]);

      parsed.push({
        type: "room",
        furnitureId: "",
        label: "Room",
        shape: "rect",
        // Store the TRUE center so centroid / camera calculations are correct
        x: centerX,
        y: centerY,
        width: objWidth * ownScaleX,
        height: objHeight * ownScaleY,
        angle: absAngle,
        fill: "#faf7f0",
        stroke: "#a89070",
        points: absPoints,
      });
      return;
    }

    if (data.furnitureId) {
      const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
      const shape = catalogItem?.shape || "rect";
      // Prefer catalog dimensions over raw object dimensions
      const w = (catalogItem?.defaultWidth || obj.width || 40) * ownScaleX;
      const h = (catalogItem?.defaultHeight || obj.height || 40) * ownScaleY;
      const r = catalogItem?.defaultRadius ? catalogItem.defaultRadius * ownScaleX : undefined;

      parsed.push({
        type: "furniture",
        furnitureId: data.furnitureId,
        label: data.label || data.furnitureId,
        shape,
        x: absX,
        y: absY,
        width: w,
        height: h,
        radius: r,
        angle: absAngle,
        fill: catalogItem?.fill || obj.fill || "#f5f0e8",
        stroke: catalogItem?.stroke || obj.stroke || "#c4b5a0",
      });
    }
  }

  for (const obj of fabricObjects) {
    processObject(obj);
  }

  return {
    objects: parsed,
    canvasWidth: (canvasJSON as any).width || 800,
    canvasHeight: (canvasJSON as any).height || 600,
  };
}
