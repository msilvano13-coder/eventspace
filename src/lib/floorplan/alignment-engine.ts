import { Canvas, FabricObject, Line, FabricText } from "fabric";
import { isSpatialObject } from "./canvas-helpers";

// ── Constants ──

export const ALIGNMENT_SNAP_THRESHOLD = 8; // pixels — magnetic pull distance
const GUIDE_COLOR = "#3b82f6"; // blue
const GUIDE_DASH = [4, 4];
const GUIDE_WIDTH = 0.75;
const GUIDE_EXTENSION = 20; // extend guides past object edges for visibility

// ── Types ──

export interface ObjectBounds {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface AlignmentLine {
  type: "horizontal" | "vertical";
  position: number;
  start: number;
  end: number;
  snapType: "edge" | "center";
}

export interface SnapResult {
  deltaX: number;
  deltaY: number;
  guides: AlignmentLine[];
}

// ── Bounds Computation ──

/** Get axis-aligned bounding box for an object in canvas coordinates */
export function computeObjectBounds(obj: FabricObject): ObjectBounds {
  const rect = obj.getBoundingRect();
  return {
    id: obj.data?._objectId || "",
    left: rect.left,
    right: rect.left + rect.width,
    top: rect.top,
    bottom: rect.top + rect.height,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  };
}

/** Cache bounds of all spatial objects except the excluded ones */
export function buildBoundsCache(canvas: Canvas, excludeIds: Set<string>): ObjectBounds[] {
  const bounds: ObjectBounds[] = [];
  for (const obj of canvas.getObjects()) {
    if (!isSpatialObject(obj)) continue;
    const id = obj.data?._objectId;
    if (id && excludeIds.has(id)) continue;
    bounds.push(computeObjectBounds(obj));
  }
  return bounds;
}

// ── Alignment Detection ──

/** Find alignment snap opportunities between dragged object bounds and cached bounds */
export function findAlignments(
  draggedBounds: ObjectBounds,
  otherBounds: ObjectBounds[],
  threshold: number = ALIGNMENT_SNAP_THRESHOLD,
): SnapResult {
  let bestDeltaX = Infinity;
  let bestDeltaY = Infinity;
  const guides: AlignmentLine[] = [];

  // Reference points for the dragged object
  const dragXPoints = [
    { value: draggedBounds.left, type: "edge" as const },
    { value: draggedBounds.centerX, type: "center" as const },
    { value: draggedBounds.right, type: "edge" as const },
  ];
  const dragYPoints = [
    { value: draggedBounds.top, type: "edge" as const },
    { value: draggedBounds.centerY, type: "center" as const },
    { value: draggedBounds.bottom, type: "edge" as const },
  ];

  for (const other of otherBounds) {
    const otherXPoints = [other.left, other.centerX, other.right];
    const otherYPoints = [other.top, other.centerY, other.bottom];

    // Check vertical alignments (X-axis snap)
    for (const dragPt of dragXPoints) {
      for (const otherX of otherXPoints) {
        const diff = otherX - dragPt.value;
        if (Math.abs(diff) <= threshold && Math.abs(diff) <= Math.abs(bestDeltaX)) {
          if (Math.abs(diff) < Math.abs(bestDeltaX)) {
            // New best — clear previous X guides
            guides.splice(0, guides.length, ...guides.filter((g) => g.type === "horizontal"));
            bestDeltaX = diff;
          }
          // Vertical guide line at this X position
          const minY = Math.min(draggedBounds.top, other.top) - GUIDE_EXTENSION;
          const maxY = Math.max(draggedBounds.bottom, other.bottom) + GUIDE_EXTENSION;
          guides.push({
            type: "vertical",
            position: otherX,
            start: minY,
            end: maxY,
            snapType: dragPt.type,
          });
        }
      }
    }

    // Check horizontal alignments (Y-axis snap)
    for (const dragPt of dragYPoints) {
      for (const otherY of otherYPoints) {
        const diff = otherY - dragPt.value;
        if (Math.abs(diff) <= threshold && Math.abs(diff) <= Math.abs(bestDeltaY)) {
          if (Math.abs(diff) < Math.abs(bestDeltaY)) {
            // New best — clear previous Y guides
            guides.splice(0, guides.length, ...guides.filter((g) => g.type === "vertical"));
            bestDeltaY = diff;
          }
          const minX = Math.min(draggedBounds.left, other.left) - GUIDE_EXTENSION;
          const maxX = Math.max(draggedBounds.right, other.right) + GUIDE_EXTENSION;
          guides.push({
            type: "horizontal",
            position: otherY,
            start: minX,
            end: maxX,
            snapType: dragPt.type,
          });
        }
      }
    }
  }

  return {
    deltaX: Math.abs(bestDeltaX) <= threshold ? bestDeltaX : 0,
    deltaY: Math.abs(bestDeltaY) <= threshold ? bestDeltaY : 0,
    guides: deduplicateGuides(guides),
  };
}

/** Remove duplicate guide lines */
function deduplicateGuides(guides: AlignmentLine[]): AlignmentLine[] {
  const seen = new Set<string>();
  return guides.filter((g) => {
    const key = `${g.type}:${Math.round(g.position)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Guide Rendering ──

// Object pool for guide lines to avoid GC pressure during drag
let guidePool: { line: FabricObject; label?: FabricText }[] = [];

/** Render alignment guide lines on the canvas. Returns objects added (for cleanup). */
export function renderGuides(canvas: Canvas, guides: AlignmentLine[]): void {
  // Hide all previously active guides
  clearGuides();

  // Ensure pool is large enough
  while (guidePool.length < guides.length) {
    const line = new Line([0, 0, 0, 0], {
      stroke: GUIDE_COLOR,
      strokeWidth: GUIDE_WIDTH,
      strokeDashArray: GUIDE_DASH,
      selectable: false,
      evented: false,
      data: { isGuide: true, isAlignmentGuide: true },
    });
    canvas.add(line);
    guidePool.push({ line });
  }

  // Position and show needed guides
  for (let i = 0; i < guides.length; i++) {
    const g = guides[i];
    const line = guidePool[i].line as Line;

    if (g.type === "vertical") {
      line.set({ x1: g.position, y1: g.start, x2: g.position, y2: g.end });
    } else {
      line.set({ x1: g.start, y1: g.position, x2: g.end, y2: g.position });
    }

    line.set("visible", true);
    line.setCoords();
    canvas.bringObjectToFront(line);
  }

  // Hide unused pool members
  for (let i = guides.length; i < guidePool.length; i++) {
    guidePool[i].line.set("visible", false);
  }
}

/** Hide all alignment guides */
export function clearGuides(): void {
  for (let i = 0; i < guidePool.length; i++) {
    guidePool[i].line.set("visible", false);
  }
}

/** Remove all guide pool objects from canvas (call on unmount) */
export function disposeGuides(canvas: Canvas): void {
  for (const item of guidePool) {
    canvas.remove(item.line);
  }
  guidePool = [];
}
