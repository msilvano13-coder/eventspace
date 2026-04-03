import { Canvas, FabricObject, Group } from "fabric";
import { isFurnitureObject } from "./canvas-helpers";

// ── Constants ──

export const COLLISION_HIGHLIGHT_COLOR = "#ef4444";
const COLLISION_STROKE_WIDTH = 2.5;

// ── Types ──

export interface CollisionResult {
  hasCollision: boolean;
  collidingObjectIds: string[];
}

// ── Helpers ──

/** Get the visible shape inside a Group (first non-text child), or the object itself */
function getVisibleShape(obj: FabricObject): FabricObject {
  if (obj instanceof Group) {
    const children = obj.getObjects();
    // For table sets (nested groups), find the first child group and recurse
    for (const child of children) {
      if (child instanceof Group) {
        return getVisibleShape(child);
      }
    }
    // For simple furniture (shape + text), return the first child (the shape)
    if (children.length > 0) {
      return children[0];
    }
  }
  return obj;
}

// ── Detection ──

/** Detect which objects the target overlaps with. Uses Fabric.js intersectsWithObject (AABB). */
export function detectCollisions(
  target: FabricObject,
  canvas: Canvas,
  excludeIds?: Set<string>,
): CollisionResult {
  const collidingIds: string[] = [];
  const targetCenter = target.getCenterPoint();
  const targetDiag = Math.sqrt(
    Math.pow(target.getScaledWidth(), 2) + Math.pow(target.getScaledHeight(), 2),
  );

  for (const other of canvas.getObjects()) {
    if (other === target) continue;
    if (!isFurnitureObject(other)) continue;
    const otherId = other.data?._objectId;
    if (otherId && excludeIds?.has(otherId)) continue;

    // Quick center-distance pre-filter
    const otherCenter = other.getCenterPoint();
    const otherDiag = Math.sqrt(
      Math.pow(other.getScaledWidth(), 2) + Math.pow(other.getScaledHeight(), 2),
    );
    const centerDist = Math.sqrt(
      Math.pow(targetCenter.x - otherCenter.x, 2) +
      Math.pow(targetCenter.y - otherCenter.y, 2),
    );
    if (centerDist > (targetDiag + otherDiag) / 2) continue;

    // Detailed intersection check
    if (target.intersectsWithObject(other)) {
      collidingIds.push(otherId || "");
    }
  }

  return {
    hasCollision: collidingIds.length > 0,
    collidingObjectIds: collidingIds,
  };
}

// ── Visual Feedback ──

/** Apply red highlight to an object (stores original stroke for later restoration) */
export function applyCollisionHighlight(obj: FabricObject): void {
  if (obj.data?._collisionHighlighted) return; // already highlighted

  // Target the inner shape for Groups (setting stroke on Group itself isn't visible)
  const shape = getVisibleShape(obj);

  // Store originals on the parent object's data
  obj.data = {
    ...obj.data,
    _collisionHighlighted: true,
    _preCollisionStroke: shape.stroke,
    _preCollisionStrokeWidth: shape.strokeWidth,
  };

  shape.set({
    stroke: COLLISION_HIGHLIGHT_COLOR,
    strokeWidth: COLLISION_STROKE_WIDTH,
  });
}

/** Remove collision highlight and restore original stroke */
export function removeCollisionHighlight(obj: FabricObject): void {
  if (!obj.data?._collisionHighlighted) return;

  const shape = getVisibleShape(obj);

  shape.set({
    stroke: obj.data._preCollisionStroke ?? shape.stroke,
    strokeWidth: obj.data._preCollisionStrokeWidth ?? shape.strokeWidth,
  });

  const newData = { ...obj.data };
  delete newData._collisionHighlighted;
  delete newData._preCollisionStroke;
  delete newData._preCollisionStrokeWidth;
  obj.data = newData;
}

/** Clear all collision highlights on canvas */
export function clearAllHighlights(canvas: Canvas): void {
  for (const obj of canvas.getObjects()) {
    if (obj.data?._collisionHighlighted) {
      removeCollisionHighlight(obj);
    }
  }
}

// ── Per-Frame Collision Check (convenience) ──

/** Track which objects are currently highlighted so we can un-highlight them */
const highlightedSet = new Set<string>();

/** Run collision detection and update highlights. Call on every object:moving frame. */
export function updateCollisionHighlights(
  target: FabricObject,
  canvas: Canvas,
): void {
  const result = detectCollisions(target, canvas);

  // Highlight target if colliding
  if (result.hasCollision) {
    applyCollisionHighlight(target);
  } else {
    removeCollisionHighlight(target);
  }

  // Highlight colliding objects, un-highlight previously-colliding that no longer collide
  const newSet = new Set(result.collidingObjectIds);

  Array.from(highlightedSet).forEach((id) => {
    if (!newSet.has(id)) {
      const obj = canvas.getObjects().find((o) => o.data?._objectId === id);
      if (obj) removeCollisionHighlight(obj);
    }
  });

  newSet.forEach((id) => {
    const obj = canvas.getObjects().find((o) => o.data?._objectId === id);
    if (obj) applyCollisionHighlight(obj);
  });

  highlightedSet.clear();
  newSet.forEach((id) => highlightedSet.add(id));
}

/** Clear all tracked highlights (call on mouse:up) */
export function resetCollisionTracking(canvas: Canvas): void {
  Array.from(highlightedSet).forEach((id) => {
    const obj = canvas.getObjects().find((o) => o.data?._objectId === id);
    if (obj) removeCollisionHighlight(obj);
  });
  highlightedSet.clear();
  // Also clean target highlight if lingering
  clearAllHighlights(canvas);
}
