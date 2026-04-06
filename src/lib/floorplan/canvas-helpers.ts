import { Canvas, FabricObject, ActiveSelection, Group } from "fabric";
import { v4 as uuid } from "uuid";
import { GRID_SIZE } from "@/lib/constants";

// ── Object ID Management ──

/** Assign a stable unique ID to a Fabric object if it doesn't have one */
export function ensureObjectId(obj: FabricObject): string {
  if (!obj.data) obj.data = {};
  if (!obj.data._objectId) {
    obj.data = { ...obj.data, _objectId: uuid() };
  }
  return obj.data._objectId;
}

/** Look up an object by its stable ID */
export function getObjectById(canvas: Canvas, id: string): FabricObject | undefined {
  return canvas.getObjects().find((o) => o.data?._objectId === id);
}

/** Assign IDs to all objects on canvas that lack them (for legacy data) */
export function ensureAllObjectIds(canvas: Canvas): void {
  canvas.getObjects().forEach((o) => {
    if (isContentObject(o)) ensureObjectId(o);
  });
}

/**
 * Fix zero-dimension Groups after loadFromJSON.
 * Fabric.js v6 doesn't always recalculate group bounds from children during
 * deserialization, leaving groups at 0×0 (invisible). This triggers a
 * recalculation for any affected groups.
 */
export function recalcGroupDimensions(canvas: Canvas): void {
  for (const obj of canvas.getObjects()) {
    if (obj instanceof Group && obj.width === 0 && obj.height === 0) {
      (obj as Group).triggerLayout();
      obj.setCoords();
    }
  }
}

// ── Object Filtering ──

/** True for furniture items (tables, chairs, decor, etc.) */
export function isFurnitureObject(obj: FabricObject): boolean {
  return !!(obj.data?.furnitureId) && !obj.data?.isLighting && !obj.data?.isGrid;
}

/** True for user-placed content (furniture + room shapes). Excludes grid, lighting, guides, overlays. */
export function isContentObject(obj: FabricObject): boolean {
  if (!obj.data) return false;
  if (obj.data.isGrid || obj.data.isLighting || obj.data.isLightingOverlay || obj.data.isGuide || obj.data.isMeasure) return false;
  return true;
}

/** True for objects that should participate in alignment/collision checks */
export function isSpatialObject(obj: FabricObject): boolean {
  return isFurnitureObject(obj) || obj.data?.isRoom === true;
}

// ── State Capture ──

export interface ObjectSnapshot {
  objectId: string;
  left: number;
  top: number;
  angle: number;
  scaleX: number;
  scaleY: number;
}

/** Capture the transform state of a single object (absolute canvas coords) */
export function captureObjectState(obj: FabricObject): ObjectSnapshot {
  const center = obj.getCenterPoint();
  return {
    objectId: ensureObjectId(obj),
    left: center.x,
    top: center.y,
    angle: obj.angle || 0,
    scaleX: obj.scaleX || 1,
    scaleY: obj.scaleY || 1,
  };
}

/** Capture transform state for all objects in an ActiveSelection */
export function captureSelectionState(selection: ActiveSelection): ObjectSnapshot[] {
  return selection.getObjects()
    .filter(isFurnitureObject)
    .map(captureObjectState);
}

// ── Position Finding ──

/** Find a non-overlapping position near the preferred point using spiral search */
export function findOpenPosition(
  canvas: Canvas,
  preferX: number,
  preferY: number,
): { x: number; y: number } {
  const objects = canvas.getObjects().filter((o) => isContentObject(o) && !o.data?.isRoom);
  const step = GRID_SIZE * 5;
  const canvasW = canvas.getWidth();
  const canvasH = canvas.getHeight();
  let x = preferX;
  let y = preferY;

  for (let attempt = 0; attempt < 20; attempt++) {
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

    if (snappedX < 50 || snappedX > canvasW - 50 || snappedY < 50 || snappedY > canvasH - 50) {
      x = preferX + step * ((attempt % 4 < 2 ? 1 : -1) * Math.ceil((attempt + 1) / 2));
      y = preferY + step * ((attempt % 2 === 0 ? 0 : 1) * Math.ceil((attempt + 1) / 2));
      continue;
    }

    const tooClose = objects.some((obj) => {
      const ox = obj.left || 0;
      const oy = obj.top || 0;
      return Math.abs(ox - snappedX) < step && Math.abs(oy - snappedY) < step;
    });

    if (!tooClose) return { x: snappedX, y: snappedY };

    x = preferX + step * ((attempt % 4 < 2 ? 1 : -1) * Math.ceil((attempt + 1) / 2));
    y = preferY + step * ((attempt % 2 === 0 ? 0 : 1) * Math.ceil((attempt + 1) / 2));
  }

  const finalX = Math.max(50, Math.min(canvasW - 50, Math.round(x / GRID_SIZE) * GRID_SIZE));
  const finalY = Math.max(50, Math.min(canvasH - 50, Math.round(y / GRID_SIZE) * GRID_SIZE));
  return { x: finalX, y: finalY };
}
