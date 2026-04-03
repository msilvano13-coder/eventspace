import { Canvas, FabricObject, Line, FabricText } from "fabric";
import { pxToFeetInches } from "@/lib/constants";
import { ObjectBounds } from "./alignment-engine";

// ── Constants ──

const INDICATOR_COLOR = "#a855f7"; // purple to distinguish from measure tool (red) and guides (blue)
const INDICATOR_DASH = [4, 3];
const INDICATOR_STROKE_WIDTH = 1;
const INDICATOR_FONT_SIZE = 10;
const MAX_INDICATORS = 4; // nearest per cardinal direction

// ── Types ──

export interface DistanceIndicator {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  distance: number; // in pixels (= inches since PIXELS_PER_INCH = 1)
  label: string;
}

// ── Computation ──

/** Compute distance indicators from target to nearest objects in each direction + canvas edges */
/** Room boundary rectangle for distance calculations */
export interface RoomBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function computeNearestDistances(
  targetBounds: ObjectBounds,
  otherBounds: ObjectBounds[],
  canvasWidth: number,
  canvasHeight: number,
  roomBounds?: RoomBounds,
): DistanceIndicator[] {
  const indicators: DistanceIndicator[] = [];

  // Use room walls as boundaries if available, otherwise fall back to canvas edges
  const wallLeft = roomBounds ? roomBounds.left : 0;
  const wallTop = roomBounds ? roomBounds.top : 0;
  const wallRight = roomBounds ? roomBounds.right : canvasWidth;
  const wallBottom = roomBounds ? roomBounds.bottom : canvasHeight;

  // Find nearest object in each cardinal direction from target center
  let nearestLeft: { dist: number; point: number; y: number } | null = null;
  let nearestRight: { dist: number; point: number; y: number } | null = null;
  let nearestUp: { dist: number; point: number; x: number } | null = null;
  let nearestDown: { dist: number; point: number; x: number } | null = null;

  for (const other of otherBounds) {
    // Only consider objects that vertically overlap for left/right checks
    const vOverlap = other.bottom > targetBounds.top && other.top < targetBounds.bottom;
    // Only consider objects that horizontally overlap for up/down checks
    const hOverlap = other.right > targetBounds.left && other.left < targetBounds.right;

    if (vOverlap) {
      // Left: object is to the left of target
      if (other.right <= targetBounds.left) {
        const dist = targetBounds.left - other.right;
        if (!nearestLeft || dist < nearestLeft.dist) {
          nearestLeft = { dist, point: other.right, y: (Math.max(targetBounds.top, other.top) + Math.min(targetBounds.bottom, other.bottom)) / 2 };
        }
      }
      // Right: object is to the right of target
      if (other.left >= targetBounds.right) {
        const dist = other.left - targetBounds.right;
        if (!nearestRight || dist < nearestRight.dist) {
          nearestRight = { dist, point: other.left, y: (Math.max(targetBounds.top, other.top) + Math.min(targetBounds.bottom, other.bottom)) / 2 };
        }
      }
    }

    if (hOverlap) {
      // Up: object is above target
      if (other.bottom <= targetBounds.top) {
        const dist = targetBounds.top - other.bottom;
        if (!nearestUp || dist < nearestUp.dist) {
          nearestUp = { dist, point: other.bottom, x: (Math.max(targetBounds.left, other.left) + Math.min(targetBounds.right, other.right)) / 2 };
        }
      }
      // Down: object is below target
      if (other.top >= targetBounds.bottom) {
        const dist = other.top - targetBounds.bottom;
        if (!nearestDown || dist < nearestDown.dist) {
          nearestDown = { dist, point: other.top, x: (Math.max(targetBounds.left, other.left) + Math.min(targetBounds.right, other.right)) / 2 };
        }
      }
    }
  }

  // Check room walls (or canvas edges) as potential nearest boundaries
  const edgeLeft = targetBounds.left - wallLeft;
  const edgeRight = wallRight - targetBounds.right;
  const edgeTop = targetBounds.top - wallTop;
  const edgeBottom = wallBottom - targetBounds.bottom;

  if (!nearestLeft || edgeLeft < nearestLeft.dist) {
    nearestLeft = { dist: edgeLeft, point: wallLeft, y: targetBounds.centerY };
  }
  if (!nearestRight || edgeRight < nearestRight.dist) {
    nearestRight = { dist: edgeRight, point: wallRight, y: targetBounds.centerY };
  }
  if (!nearestUp || edgeTop < nearestUp.dist) {
    nearestUp = { dist: edgeTop, point: wallTop, x: targetBounds.centerX };
  }
  if (!nearestDown || edgeBottom < nearestDown.dist) {
    nearestDown = { dist: edgeBottom, point: wallBottom, x: targetBounds.centerX };
  }

  // Build indicators
  if (nearestLeft && nearestLeft.dist > 0) {
    indicators.push({
      fromX: targetBounds.left,
      fromY: nearestLeft.y,
      toX: nearestLeft.point,
      toY: nearestLeft.y,
      distance: nearestLeft.dist,
      label: pxToFeetInches(nearestLeft.dist),
    });
  }
  if (nearestRight && nearestRight.dist > 0) {
    indicators.push({
      fromX: targetBounds.right,
      fromY: nearestRight.y,
      toX: nearestRight.point,
      toY: nearestRight.y,
      distance: nearestRight.dist,
      label: pxToFeetInches(nearestRight.dist),
    });
  }
  if (nearestUp && nearestUp.dist > 0) {
    indicators.push({
      fromX: nearestUp.x,
      fromY: targetBounds.top,
      toX: nearestUp.x,
      toY: nearestUp.point,
      distance: nearestUp.dist,
      label: pxToFeetInches(nearestUp.dist),
    });
  }
  if (nearestDown && nearestDown.dist > 0) {
    indicators.push({
      fromX: nearestDown.x,
      fromY: targetBounds.bottom,
      toX: nearestDown.x,
      toY: nearestDown.point,
      distance: nearestDown.dist,
      label: pxToFeetInches(nearestDown.dist),
    });
  }

  return indicators.slice(0, MAX_INDICATORS);
}

// ── Rendering (Object Pool) ──

let indicatorPool: { line: FabricObject; text: FabricText }[] = [];

/** Render distance indicators on canvas */
export function renderDistanceIndicators(canvas: Canvas, indicators: DistanceIndicator[]): void {
  clearDistanceIndicators();

  while (indicatorPool.length < indicators.length) {
    const line = new Line([0, 0, 0, 0], {
      stroke: INDICATOR_COLOR,
      strokeWidth: INDICATOR_STROKE_WIDTH,
      strokeDashArray: INDICATOR_DASH,
      selectable: false,
      evented: false,
      data: { isGuide: true, isDistanceIndicator: true },
    });
    const text = new FabricText("", {
      fontSize: INDICATOR_FONT_SIZE,
      fontFamily: "sans-serif",
      fontWeight: "600",
      fill: INDICATOR_COLOR,
      backgroundColor: "rgba(255,255,255,0.85)",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
      data: { isGuide: true, isDistanceIndicator: true },
    });
    canvas.add(line);
    canvas.add(text);
    indicatorPool.push({ line, text });
  }

  for (let i = 0; i < indicators.length; i++) {
    const ind = indicators[i];
    const item = indicatorPool[i];
    const line = item.line as Line;

    line.set({ x1: ind.fromX, y1: ind.fromY, x2: ind.toX, y2: ind.toY, visible: true });
    line.setCoords();

    const midX = (ind.fromX + ind.toX) / 2;
    const midY = (ind.fromY + ind.toY) / 2;
    // Offset label perpendicular to the line
    const isHorizontal = Math.abs(ind.fromY - ind.toY) < 1;
    item.text.set({
      text: ind.label,
      left: midX + (isHorizontal ? 0 : 12),
      top: midY + (isHorizontal ? -12 : 0),
      visible: true,
    });
    item.text.setCoords();

    canvas.bringObjectToFront(line);
    canvas.bringObjectToFront(item.text);
  }

  for (let i = indicators.length; i < indicatorPool.length; i++) {
    indicatorPool[i].line.set("visible", false);
    indicatorPool[i].text.set("visible", false);
  }
}

/** Hide all distance indicators */
export function clearDistanceIndicators(): void {
  for (const item of indicatorPool) {
    item.line.set("visible", false);
    item.text.set("visible", false);
  }
}

/** Remove all indicator pool objects from canvas (call on unmount) */
export function disposeDistanceIndicators(canvas: Canvas): void {
  for (const item of indicatorPool) {
    canvas.remove(item.line);
    canvas.remove(item.text);
  }
  indicatorPool = [];
}
