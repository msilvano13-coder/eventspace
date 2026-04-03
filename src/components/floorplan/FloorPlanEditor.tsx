"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Canvas,
  Rect,
  Circle,
  Group,
  FabricText,
  FabricObject,
  Polygon,
  Gradient,
  Shadow,
  ActiveSelection,
  Line,
  util,
} from "fabric";
import { GRID_SIZE, ROOM_PRESETS, FURNITURE_GROUPS, FurnitureGroup, pxToFeetInches } from "@/lib/constants";
import {
  unwrapCanvasJSON,
  serializeFloorPlan,
} from "@/lib/floorplan-schema";

// Ensure custom 'data' property is serialized
const origToObject = FabricObject.prototype.toObject;
FabricObject.prototype.toObject = function (propertiesToInclude?: string[]) {
  return origToObject.call(this, [...(propertiesToInclude || []), "data"]);
};

import { v4 as uuid } from "uuid";
import { FurnitureItemDef, LayoutObject, LightingZone, RoomPreset, RoomShape, Tablescape } from "@/lib/types";
import { getFurnitureById } from "./furniture-items";
import FurniturePalette from "./FurniturePalette";
import Toolbar, { RotationSnapValue, ROTATION_SNAP_OPTIONS } from "./Toolbar";
import PropertiesPanel from "./PropertiesPanel";
import { Plus, X } from "lucide-react";
import { LAYOUT_TEMPLATES, LayoutTemplate } from "@/lib/layout-templates";
import {
  ensureObjectId,
  ensureAllObjectIds,
  captureObjectState,
  captureSelectionState,
  findOpenPosition,
  ObjectSnapshot,
} from "@/lib/floorplan/canvas-helpers";
import {
  CommandHistory,
  MoveCommand,
  RotateCommand,
  AddCommand,
  RemoveCommand,
  BatchCommand,
} from "@/lib/floorplan/command-history";
import {
  buildBoundsCache,
  computeObjectBounds,
  findAlignments,
  renderGuides,
  clearGuides,
  disposeGuides,
  ObjectBounds,
  ALIGNMENT_SNAP_THRESHOLD,
} from "@/lib/floorplan/alignment-engine";
import {
  updateCollisionHighlights,
  resetCollisionTracking,
} from "@/lib/floorplan/collision-detection";
import {
  computeNearestDistances,
  renderDistanceIndicators,
  clearDistanceIndicators,
  disposeDistanceIndicators,
} from "@/lib/floorplan/distance-indicators";
import {
  canvasToLayoutObjects,
  roomShapeFromCanvas,
} from "@/lib/floorplan/canvas-bridge";

interface Props {
  eventId: string;
  floorPlanId?: string;
  initialJSON: string | null;
  initialLayoutObjects?: LayoutObject[];
  onSave?: (json: string) => void;
  onSaveLayoutObjects?: (objects: LayoutObject[], roomShape: RoomShape | null, canvasWidth: number, canvasHeight: number) => void;
  // Lighting integration — zones rendered directly on canvas
  lightingZones?: LightingZone[];
  lightingEnabled?: boolean;
  onUpdateZones?: (zones: LightingZone[]) => void;
  selectedZoneId?: string | null;
  onSelectZone?: (id: string | null) => void;
  readOnly?: boolean; // client portal: makes lighting non-interactive
  onCanvasReady?: (getDataURL: () => string | null) => void;
  // Seating drag-and-drop — called when a guest is dropped onto a table on the canvas
  onGuestDrop?: (guestId: string, tableId: string) => void;
  // Tablescape assignment — available designs to assign to tables
  tablescapes?: Tablescape[];
  onAssignTablescape?: (tableObjectId: string, tablescapeId: string | null) => void;
}

interface SelectedInfo {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  furnitureId: string;
  tablescapeId?: string;
}

// ── Lighting helpers ──

/** Create a Fabric.js Circle for a lighting zone. */
function createLightingObject(zone: LightingZone, canvasW: number, canvasH: number, isSelected: boolean, interactive: boolean = true): Group {
  const pixelX = (zone.x / 100) * canvasW;
  const pixelY = (zone.y / 100) * canvasH;
  const opacity = zone.intensity / 100;
  const glowRadius = zone.size * 1.8;

  // Outer glow circle
  const glow = new Circle({
    radius: glowRadius,
    originX: "center",
    originY: "center",
    fill: new Gradient({
      type: "radial",
      coords: {
        x1: 0,
        y1: 0,
        r1: 0,
        x2: 0,
        y2: 0,
        r2: glowRadius,
      },
      colorStops: [
        { offset: 0, color: zone.color + Math.round(opacity * 80).toString(16).padStart(2, "0") },
        { offset: 0.6, color: zone.color + "15" },
        { offset: 1, color: "transparent" },
      ],
    }),
    selectable: false,
    evented: false,
  });

  // Core circle
  const coreRadius = zone.size * 0.4;
  const core = new Circle({
    radius: coreRadius,
    originX: "center",
    originY: "center",
    fill: zone.color + "25",
    stroke: isSelected ? "#fb7185" : "rgba(255,255,255,0.4)",
    strokeWidth: isSelected ? 2.5 : 1.5,
    selectable: false,
    evented: false,
  });

  // Label
  const labelSize = zone.size < 30 ? 7 : zone.size < 50 ? 8 : 9;
  const maxChars = zone.size < 50 ? 6 : 12;
  const displayName = zone.name.length > maxChars ? zone.name.slice(0, maxChars - 2) + "…" : zone.name;
  const label = new FabricText(zone.size >= 20 ? displayName : "", {
    fontSize: labelSize,
    fill: "rgba(255,255,255,0.9)",
    fontFamily: "sans-serif",
    fontWeight: "600",
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
  });

  const group = new Group([glow, core, label], {
    left: pixelX,
    top: pixelY,
    originX: "center",
    originY: "center",
    angle: zone.angle ?? 0,
    selectable: interactive,
    evented: interactive,
    hasControls: false,
    hasBorders: false,
    lockRotation: true,
    data: { isLighting: true, zoneId: zone.id },
  });

  // Selection ring for selected zone
  if (isSelected) {
    group.set("shadow", new Shadow({
      color: "rgba(251,113,133,0.4)",
      blur: 12,
      offsetX: 0,
      offsetY: 0,
    }));
  }

  return group;
}

// Small SVG preview for room shape picker
function RoomShapePreview({ preset }: { preset: RoomPreset }) {
  const W = 88;
  const H = 64;
  const pad = 10;
  const scale = Math.min((W - pad * 2) / preset.width, (H - pad * 2) / preset.height);
  const scaledW = preset.width * scale;
  const scaledH = preset.height * scale;
  const ox = (W - scaledW) / 2;
  const oy = (H - scaledH) / 2;
  const d =
    preset.points
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x * scale + ox} ${y * scale + oy}`)
      .join(" ") + " Z";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="pointer-events-none">
      <path d={d} fill="#faf7f0" stroke="#b8a89a" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function FloorPlanEditor({
  eventId,
  floorPlanId,
  initialJSON,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialLayoutObjects: _initialLayoutObjects,
  onSave,
  onSaveLayoutObjects,
  lightingZones = [],
  lightingEnabled = false,
  onUpdateZones,
  selectedZoneId = null,
  onSelectZone,
  readOnly = false,
  onCanvasReady,
  onGuestDrop,
  tablescapes = [],
  onAssignTablescape,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [rotationSnap, setRotationSnap] = useState<RotationSnapValue>(15);
  const [zoom, setZoom] = useState(1);
  const [selectedInfo, setSelectedInfo] = useState<SelectedInfo | null>(null);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [customRoomWidth, setCustomRoomWidth] = useState("50");
  const [customRoomHeight, setCustomRoomHeight] = useState("30");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const gridObjectsRef = useRef<FabricObject[]>([]);
  const lightingOverlayRef = useRef<Rect | null>(null);
  const lightingObjectsRef = useRef<Map<string, Group>>(new Map());
  const clipboardRef = useRef<any[]>([]);
  const clipboardLightingRef = useRef<LightingZone[]>([]);
  const [canPaste, setCanPaste] = useState(false);
  const angleGuideRef = useRef<{ line: FabricObject; text: FabricText } | null>(null);
  const isDraggingLightRef = useRef(false);
  const [measureMode, setMeasureMode] = useState(false);
  const measureModeRef = useRef(false);
  const measurePointRef = useRef<{ x: number; y: number } | null>(null);
  const measureObjectsRef = useRef<FabricObject[]>([]);

  // ── Phase 1: Command-pattern undo/redo ──
  const historyRef = useRef(new CommandHistory(100));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [historyVersion, setHistoryVersion] = useState(0); // triggers re-render on undo/redo
  const preDragStateRef = useRef<ObjectSnapshot[] | null>(null);

  // ── Phase 1: Alignment guides + collision + distance ──
  const [alignmentEnabled, setAlignmentEnabled] = useState(true);
  const [collisionEnabled, setCollisionEnabled] = useState(true);
  const alignmentEnabledRef = useRef(true);
  const collisionEnabledRef = useRef(true);
  const boundsCacheRef = useRef<ObjectBounds[]>([]);

  // ── Refs for latest values (used in closures) ──
  const onSaveRef = useRef(onSave);
  const onSaveLayoutObjectsRef = useRef(onSaveLayoutObjects);
  const floorPlanIdRef = useRef(floorPlanId);
  const lightingZonesRef = useRef(lightingZones);
  const lightingEnabledRef = useRef(lightingEnabled);
  const selectedZoneIdRef = useRef(selectedZoneId);
  const onUpdateZonesRef = useRef(onUpdateZones);
  const onSelectZoneRef = useRef(onSelectZone);
  const readOnlyRef = useRef(readOnly);
  const snapEnabledRef = useRef(snapEnabled);
  const rotationSnapRef = useRef(rotationSnap);
  useEffect(() => {
    onSaveRef.current = onSave;
    onSaveLayoutObjectsRef.current = onSaveLayoutObjects;
    floorPlanIdRef.current = floorPlanId;
    lightingZonesRef.current = lightingZones;
    lightingEnabledRef.current = lightingEnabled;
    selectedZoneIdRef.current = selectedZoneId;
    onUpdateZonesRef.current = onUpdateZones;
    onSelectZoneRef.current = onSelectZone;
    readOnlyRef.current = readOnly;
    snapEnabledRef.current = snapEnabled;
    rotationSnapRef.current = rotationSnap;
    measureModeRef.current = measureMode;
    alignmentEnabledRef.current = alignmentEnabled;
    collisionEnabledRef.current = collisionEnabled;
  });

  // Subscribe to CommandHistory changes for reactive canUndo/canRedo
  useEffect(() => {
    return historyRef.current.subscribe(() => {
      setHistoryVersion((v) => v + 1);
    });
  }, []);

  // ── Measure mode: disable selection, change cursor ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (measureMode) {
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";
      canvas.hoverCursor = "crosshair";
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    } else {
      canvas.selection = true;
      canvas.defaultCursor = "default";
      canvas.hoverCursor = "move";
      clearMeasureObjects();
    }
  }, [measureMode]);

  // ── Serialize canvas excluding lighting objects ──
  const getCanvasJSON = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return null;

    // Temporarily remove non-content objects so they don't get serialized
    const lightingObjs = canvas.getObjects().filter((o: any) => o.data?.isLighting);
    const guideObjs = canvas.getObjects().filter((o: any) => o.data?.isGuide);
    const measureObjs = canvas.getObjects().filter((o: any) => o.data?.isMeasure);
    const gridObjs = gridObjectsRef.current.filter((o) => canvas.getObjects().includes(o));
    const overlayObj = lightingOverlayRef.current;
    lightingObjs.forEach((o) => canvas.remove(o));
    guideObjs.forEach((o) => canvas.remove(o));
    measureObjs.forEach((o) => canvas.remove(o));
    gridObjs.forEach((o) => canvas.remove(o));
    if (overlayObj) canvas.remove(overlayObj);

    const rawJSON = canvas.toJSON();
    // Fabric.js v6 toJSON() does not serialize canvas dimensions —
    // inject them so the 3D view can convert lighting zone percentages correctly
    (rawJSON as any).width = canvas.getWidth();
    (rawJSON as any).height = canvas.getHeight();

    // Re-add non-content objects
    gridObjs.forEach((o) => { canvas.add(o); canvas.sendObjectToBack(o); });
    if (overlayObj && lightingEnabledRef.current) canvas.add(overlayObj);
    lightingObjs.forEach((o) => canvas.add(o));
    measureObjs.forEach((o) => canvas.add(o));

    return rawJSON;
  }, []);

  // ── Push to command history (replaces old snapshot-based pushUndo) ──
  const pushCommand = useCallback((cmd: import("@/lib/floorplan/command-history").FloorPlanCommand) => {
    if (isLoadingRef.current) return;
    historyRef.current.push(cmd);
  }, []);

  // Backward-compatible pushUndo: creates a snapshot-based command for operations
  // that don't yet have specific command types (room shape, layout template, etc.)
  const lastSnapshotRef = useRef<string | null>(null);
  const pushUndo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || isLoadingRef.current) return;
    const json = getCanvasJSON();
    if (!json) return;
    const currentSnapshot = JSON.stringify(json);
    const previousSnapshot = lastSnapshotRef.current;
    lastSnapshotRef.current = currentSnapshot;
    if (!previousSnapshot || previousSnapshot === currentSnapshot) return;
    // Create a snapshot command that restores full canvas state
    const snapshotCmd = {
      type: "snapshot" as const,
      description: "Canvas change",
      execute(c: Canvas) {
        isLoadingRef.current = true;
        lightingOverlayRef.current = null;
        lightingObjectsRef.current.clear();
        c.loadFromJSON(JSON.parse(currentSnapshot)).then(() => {
          createGrid(c, c.getWidth(), c.getHeight());
          ensureAllObjectIds(c);
          c.requestRenderAll();
          isLoadingRef.current = false;
          syncLightingToCanvas();
        });
      },
      undo(c: Canvas) {
        isLoadingRef.current = true;
        lightingOverlayRef.current = null;
        lightingObjectsRef.current.clear();
        c.loadFromJSON(JSON.parse(previousSnapshot)).then(() => {
          createGrid(c, c.getWidth(), c.getHeight());
          ensureAllObjectIds(c);
          c.requestRenderAll();
          isLoadingRef.current = false;
          syncLightingToCanvas();
        });
      },
    };
    pushCommand(snapshotCmd);
  }, [getCanvasJSON, pushCommand]);

  // ── Save status for manual save feedback ──
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Core save logic — used by both auto-save and manual save */
  const doSave = useCallback(() => {
    const canvas = fabricRef.current;
    const json = getCanvasJSON();
    if (!json) {
      console.warn("[FloorPlan] doSave: getCanvasJSON returned null");
      return false;
    }

    // Legacy save path (Fabric.js JSON blob)
    const serialized = serializeFloorPlan(json as Record<string, unknown>);
    if (!serialized) {
      console.warn("[FloorPlan] doSave: serializeFloorPlan returned null (validation failed)");
      return false;
    }
    onSaveRef.current?.(serialized);

    // Phase 2: Also extract and persist layout objects
    if (onSaveLayoutObjectsRef.current && floorPlanIdRef.current && canvas) {
      const layoutObjects = canvasToLayoutObjects(
        json as Record<string, unknown>,
        floorPlanIdRef.current,
      );
      const roomShape = roomShapeFromCanvas(json as Record<string, unknown>);
      onSaveLayoutObjectsRef.current(
        layoutObjects,
        roomShape,
        canvas.getWidth(),
        canvas.getHeight(),
      );
    }

    return true;
  }, [getCanvasJSON]);

  // ── Auto-save with schema versioning + validation ──
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      doSave();
    }, 800);
  }, [doSave]);

  /** Manual save — immediate, with visual feedback */
  const handleManualSave = useCallback(() => {
    // Flush any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveStatus("saving");
    const ok = doSave();
    setSaveStatus(ok ? "saved" : "error");
    if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
    saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2500);
  }, [doSave]);

  // ── Grid: create once, reposition on resize ──
  function createGrid(canvas: Canvas, w: number, h: number) {
    // Remove old grid
    gridObjectsRef.current.forEach((o) => canvas.remove(o));
    gridObjectsRef.current = [];

    const lines: FabricObject[] = [];
    for (let i = 0; i <= w; i += GRID_SIZE) {
      const line = new Rect({
        left: i,
        top: 0,
        width: 0.5,
        height: h,
        fill: "#e7e5e4",
        selectable: false,
        evented: false,
        data: { isGrid: true },
        objectCaching: true,
      });
      canvas.add(line);
      canvas.sendObjectToBack(line);
      lines.push(line);
    }
    for (let i = 0; i <= h; i += GRID_SIZE) {
      const line = new Rect({
        left: 0,
        top: i,
        width: w,
        height: 0.5,
        fill: "#e7e5e4",
        selectable: false,
        evented: false,
        data: { isGrid: true },
        objectCaching: true,
      });
      canvas.add(line);
      canvas.sendObjectToBack(line);
      lines.push(line);
    }
    gridObjectsRef.current = lines;
  }

  // ── Lighting: sync Fabric objects from zone state ──
  const isSyncingLightingRef = useRef(false);

  const syncLightingToCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Skip full recreate while user is actively dragging a light —
    // the object:moving handler already updates the position in real-time.
    // A full recreate would destroy the drag target mid-drag.
    if (isDraggingLightRef.current) return;

    // Re-entrancy guard: setActiveObject below can fire Fabric selection
    // events synchronously, which could re-trigger this function.
    if (isSyncingLightingRef.current) return;
    isSyncingLightingRef.current = true;

    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const enabled = lightingEnabledRef.current;
    const zones = lightingZonesRef.current;
    const selZoneId = selectedZoneIdRef.current;

    // Manage dark overlay
    if (enabled && !lightingOverlayRef.current) {
      const overlay = new Rect({
        left: 0,
        top: 0,
        width: w,
        height: h,
        fill: "rgba(10, 10, 30, 0.45)",
        selectable: false,
        evented: false,
        data: { isLightingOverlay: true },
        objectCaching: true,
      });
      canvas.add(overlay);
      lightingOverlayRef.current = overlay;
    } else if (!enabled && lightingOverlayRef.current) {
      canvas.remove(lightingOverlayRef.current);
      lightingOverlayRef.current = null;
    }

    // Update overlay size
    if (lightingOverlayRef.current) {
      lightingOverlayRef.current.set({ width: w, height: h });
    }

    // Remove old lighting zone objects
    lightingObjectsRef.current.forEach((obj) => canvas.remove(obj));
    lightingObjectsRef.current.clear();

    if (!enabled) {
      canvas.requestRenderAll();
      isSyncingLightingRef.current = false;
      return;
    }

    // Add updated lighting zone objects
    zones.forEach((zone) => {
      const obj = createLightingObject(zone, w, h, zone.id === selZoneId, !readOnlyRef.current);
      canvas.add(obj);
      lightingObjectsRef.current.set(zone.id, obj);
    });

    // Re-select the active zone so click-to-drag works without a double-click.
    // Without this, clicking a light triggers a state change that recreates all
    // lighting objects, destroying the Fabric object the user just clicked.
    if (selZoneId) {
      const selObj = lightingObjectsRef.current.get(selZoneId);
      if (selObj) {
        canvas.setActiveObject(selObj);
      }
    }

    canvas.requestRenderAll();
    isSyncingLightingRef.current = false;
  }, []);

  // ── Canvas initialization ──
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const container = containerRef.current;
    // Use larger of container size or minimum working area so there's
    // always plenty of space around the room shape
    const w = Math.max(container.clientWidth, 1400);
    const h = Math.max(container.clientHeight, 900);

    const canvas = new Canvas(canvasRef.current, {
      width: w,
      height: h,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;
    createGrid(canvas, w, h);

    canvas.on("object:moving", (e) => {
      const obj = e.target;
      if (!obj) return;

      // Capture pre-drag state on first move frame
      if (!preDragStateRef.current) {
        if (obj instanceof ActiveSelection) {
          preDragStateRef.current = captureSelectionState(obj);
          // Build bounds cache excluding dragged objects
          const ids = new Set(obj.getObjects().map((o) => o.data?._objectId).filter(Boolean) as string[]);
          boundsCacheRef.current = buildBoundsCache(canvas, ids);
        } else {
          preDragStateRef.current = [captureObjectState(obj)];
          const id = obj.data?._objectId;
          boundsCacheRef.current = buildBoundsCache(canvas, id ? new Set([id]) : new Set());
        }
      }

      // Lighting zones: snap to furniture or convert pixel position to percentage
      if (obj.data?.isLighting) {
        isDraggingLightRef.current = true;
        const objLeft = obj.left || 0;
        const objTop = obj.top || 0;

        const SNAP_DIST = 40;
        let snappedLabel: string | undefined;
        let snapX = objLeft;
        let snapY = objTop;
        let minDist = SNAP_DIST;

        const allObjects = canvas.getObjects();
        for (const other of allObjects) {
          if (other.data?.isGrid || other.data?.isLighting || other.data?.isLightingOverlay || other.data?.isRoom) continue;
          if (!other.data?.furnitureId) continue;
          const otherCenter = other.getCenterPoint();
          const dx = objLeft - otherCenter.x;
          const dy = objTop - otherCenter.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            snapX = otherCenter.x;
            snapY = otherCenter.y;
            snappedLabel = other.data.label || other.data.furnitureId;
          }
        }

        if (snappedLabel) {
          obj.set({ left: snapX, top: snapY });
          obj.setCoords();
        }

        obj.data = { ...obj.data, _snappedLabel: snappedLabel };
        return;
      }

      // Step 1: Grid snap — full grid when enabled, 1px rounding when disabled
      if (snapEnabledRef.current) {
        obj.set({
          left: Math.round((obj.left || 0) / GRID_SIZE) * GRID_SIZE,
          top: Math.round((obj.top || 0) / GRID_SIZE) * GRID_SIZE,
        });
      } else {
        // Round to nearest pixel for clean positioning without grid constraint
        obj.set({
          left: Math.round(obj.left || 0),
          top: Math.round(obj.top || 0),
        });
      }

      // Step 2: Alignment snap (overrides grid when within threshold)
      if (alignmentEnabledRef.current && boundsCacheRef.current.length > 0) {
        obj.setCoords();
        const draggedBounds = computeObjectBounds(obj);
        const result = findAlignments(draggedBounds, boundsCacheRef.current, ALIGNMENT_SNAP_THRESHOLD);

        if (result.deltaX !== 0 || result.deltaY !== 0) {
          obj.set({
            left: (obj.left || 0) + result.deltaX,
            top: (obj.top || 0) + result.deltaY,
          });
          obj.setCoords();
        }

        if (result.guides.length > 0) {
          renderGuides(canvas, result.guides);
        } else {
          clearGuides();
        }
      }

      // Step 3: Collision detection
      if (collisionEnabledRef.current) {
        updateCollisionHighlights(obj, canvas);
      }

      // Step 4: Distance indicators (always show during drag regardless of alignment mode)
      obj.setCoords();
      const targetBounds = computeObjectBounds(obj);
      // Use room walls as boundaries if a room shape exists
      const roomObj = canvas.getObjects().find((o: any) => o.data?.isRoom);
      const roomBoundsForDist = roomObj ? {
        left: roomObj.left || 0,
        top: roomObj.top || 0,
        right: (roomObj.left || 0) + (roomObj.width || 0) * (roomObj.scaleX || 1),
        bottom: (roomObj.top || 0) + (roomObj.height || 0) * (roomObj.scaleY || 1),
      } : undefined;
      const distances = computeNearestDistances(
        targetBounds,
        boundsCacheRef.current,
        canvas.getWidth(),
        canvas.getHeight(),
        roomBoundsForDist,
      );
      renderDistanceIndicators(canvas, distances);
    });

    // ── Rotation snapping (configurable angle) + visual angle guide ──
    const GUIDE_LINE_LEN = 60;

    canvas.on("object:rotating", (e) => {
      const obj = e.target;
      if (!obj || obj.data?.isLighting) return;

      const snapAngle = rotationSnapRef.current;
      if (snapAngle) {
        const raw = obj.angle || 0;
        const snapped = Math.round(raw / snapAngle) * snapAngle;
        obj.rotate(snapped);
        // Also snap individual objects within ActiveSelection
        if (obj instanceof ActiveSelection) {
          obj.getObjects().forEach((child) => {
            const childRaw = child.angle || 0;
            child.rotate(Math.round(childRaw / snapAngle) * snapAngle);
          });
        }
      }

      // Show visual angle guide
      const center = obj.getCenterPoint();
      const angle = obj.angle || 0;
      const radians = (angle * Math.PI) / 180;
      const endX = center.x + Math.cos(radians - Math.PI / 2) * GUIDE_LINE_LEN;
      const endY = center.y + Math.sin(radians - Math.PI / 2) * GUIDE_LINE_LEN;

      // Remove previous guide
      if (angleGuideRef.current) {
        canvas.remove(angleGuideRef.current.line);
        canvas.remove(angleGuideRef.current.text);
        angleGuideRef.current = null;
      }

      const guideLine = new Rect({
        left: center.x,
        top: center.y,
        width: 1.5,
        height: GUIDE_LINE_LEN,
        fill: "#e11d48",
        originX: "center",
        originY: "bottom",
        angle: angle,
        selectable: false,
        evented: false,
        data: { isGuide: true },
      });

      const guideText = new FabricText(`${Math.round(angle)}°`, {
        left: endX + 8,
        top: endY - 6,
        fontSize: 11,
        fill: "#e11d48",
        fontWeight: "700",
        fontFamily: "sans-serif",
        selectable: false,
        evented: false,
        data: { isGuide: true },
      });

      canvas.add(guideLine);
      canvas.add(guideText);
      angleGuideRef.current = { line: guideLine, text: guideText };
    });

    // Remove angle guide when rotation ends
    const clearAngleGuide = () => {
      if (angleGuideRef.current) {
        canvas.remove(angleGuideRef.current.line);
        canvas.remove(angleGuideRef.current.text);
        angleGuideRef.current = null;
        canvas.requestRenderAll();
      }
    };
    canvas.on("selection:cleared", clearAngleGuide);
    canvas.on("mouse:up", () => {
      clearAngleGuide();
      isDraggingLightRef.current = false;
      // Clean up drag visuals
      clearGuides();
      clearDistanceIndicators();
      resetCollisionTracking(canvas);
      boundsCacheRef.current = [];
      canvas.requestRenderAll();
    });
    canvas.on("mouse:down", (e) => {
      if (!measureModeRef.current) return;
      const pointer = canvas.getScenePoint(e.e);
      handleMeasureClick(pointer.x, pointer.y);
    });

    const updateSelection = () => {
      const active = canvas.getActiveObject();

      // Lighting zone selected
      if (active?.data?.isLighting) {
        setSelectedInfo(null);
        if (onSelectZoneRef.current) {
          onSelectZoneRef.current(active.data.zoneId);
        }
        return;
      }

      // Multi-select (ActiveSelection)
      if (active instanceof ActiveSelection) {
        const count = active.getObjects().filter(
          (o) => !o.data?.isGrid && !o.data?.isLighting && !o.data?.isLightingOverlay && !o.data?.isRoom
        ).length;
        if (count > 0) {
          const bound = active.getBoundingRect();
          setSelectedInfo({
            label: `${count} items selected`,
            x: active.left || 0,
            y: active.top || 0,
            width: bound.width,
            height: bound.height,
            angle: 0,
            furnitureId: "",
          });
          if (onSelectZoneRef.current) {
            onSelectZoneRef.current(null);
          }
        } else {
          setSelectedInfo(null);
        }
        return;
      }

      // Furniture selected
      if (active && active.data && !active.data.isGrid && !active.data.isRoom && !active.data.isLighting && !active.data.isLightingOverlay) {
        const bound = active.getBoundingRect();
        setSelectedInfo({
          label: active.data?.label || "",
          x: active.left || 0,
          y: active.top || 0,
          width: bound.width,
          height: bound.height,
          angle: active.angle || 0,
          furnitureId: active.data?.furnitureId || "",
          tablescapeId: active.data?.tablescapeId || undefined,
        });
        if (onSelectZoneRef.current) {
          onSelectZoneRef.current(null);
        }
      } else {
        setSelectedInfo(null);
      }
    };

    canvas.on("selection:created", () => {
      // Clear any lingering drag visuals when a new selection starts
      clearGuides();
      clearDistanceIndicators();
      resetCollisionTracking(canvas);
      canvas.requestRenderAll();
      updateSelection();
    });
    canvas.on("selection:updated", updateSelection);
    canvas.on("selection:cleared", () => {
      clearGuides();
      clearDistanceIndicators();
      resetCollisionTracking(canvas);
      canvas.requestRenderAll();
      setSelectedInfo(null);
      if (onSelectZoneRef.current) {
        onSelectZoneRef.current(null);
      }
    });

    canvas.on("object:modified", (e) => {
      // Clear rotation angle guide
      clearAngleGuide();
      // Clear alignment guides, collision highlights, distance indicators
      clearGuides();
      clearDistanceIndicators();
      resetCollisionTracking(canvas);

      const obj = e.target;

      // If lighting zone was moved, persist final position.
      if (obj?.data?.isLighting) {
        isDraggingLightRef.current = false;
        const cw = canvas.getWidth();
        const ch = canvas.getHeight();
        const zoneId = obj.data.zoneId;
        const x = Math.max(0, Math.min(100, ((obj.left || 0) / cw) * 100));
        const y = Math.max(0, Math.min(100, ((obj.top || 0) / ch) * 100));
        const snappedLabel = obj.data._snappedLabel as string | undefined;
        if (onUpdateZonesRef.current && lightingZonesRef.current) {
          onUpdateZonesRef.current(
            lightingZonesRef.current.map((z) =>
              z.id === zoneId ? { ...z, x, y, snappedToFurnitureId: snappedLabel } : z
            )
          );
        }
        return;
      }

      // Create command from pre-drag state
      const preState = preDragStateRef.current;
      if (preState && preState.length > 0 && obj) {
        // Determine if this was a move or rotate (or both)
        const postState = obj instanceof ActiveSelection
          ? captureSelectionState(obj)
          : [captureObjectState(obj)];

        const commands: import("@/lib/floorplan/command-history").FloorPlanCommand[] = [];

        // Check for position changes
        const movedIds: string[] = [];
        const fromPos: Array<{ left: number; top: number }> = [];
        const toPos: Array<{ left: number; top: number }> = [];

        // Check for rotation changes
        const rotatedIds: string[] = [];
        const fromAngles: number[] = [];
        const toAngles: number[] = [];

        for (const post of postState) {
          const pre = preState.find((p) => p.objectId === post.objectId);
          if (!pre) continue;
          if (Math.abs(pre.left - post.left) > 0.5 || Math.abs(pre.top - post.top) > 0.5) {
            movedIds.push(post.objectId);
            fromPos.push({ left: pre.left, top: pre.top });
            toPos.push({ left: post.left, top: post.top });
          }
          if (Math.abs(pre.angle - post.angle) > 0.5) {
            rotatedIds.push(post.objectId);
            fromAngles.push(pre.angle);
            toAngles.push(post.angle);
          }
        }

        if (movedIds.length > 0) commands.push(new MoveCommand(movedIds, fromPos, toPos));
        if (rotatedIds.length > 0) commands.push(new RotateCommand(rotatedIds, fromAngles, toAngles));

        if (commands.length === 1) {
          pushCommand(commands[0]);
        } else if (commands.length > 1) {
          pushCommand(new BatchCommand(commands));
        }
        // Update snapshot ref for fallback pushUndo
        const json = getCanvasJSON();
        if (json) lastSnapshotRef.current = JSON.stringify(json);
      }

      preDragStateRef.current = null;
      triggerAutoSave();
      updateSelection();
    });

    // Expose canvas data URL getter for PDF export
    if (onCanvasReady) {
      onCanvasReady(() => {
        gridObjectsRef.current.forEach((o) => o.set("visible", false));
        canvas.requestRenderAll();
        const dataURL = canvas.toDataURL({ format: "png", multiplier: 2 });
        gridObjectsRef.current.forEach((o) => o.set("visible", snapEnabledRef.current));
        canvas.requestRenderAll();
        return dataURL;
      });
    }

    // Load initial JSON with schema migration
    if (initialJSON) {
      isLoadingRef.current = true;
      const canvasJSON = unwrapCanvasJSON(initialJSON);
      canvas.loadFromJSON(canvasJSON).then(() => {
        ensureAllObjectIds(canvas);
        canvas.requestRenderAll();
        isLoadingRef.current = false;
        // Capture initial snapshot for fallback undo
        const rawJSON = canvas.toJSON();
        lastSnapshotRef.current = JSON.stringify(rawJSON);
        historyRef.current.clear();
      }).catch((err) => {
        console.error("[FloorPlan] Failed to load canvas JSON:", err);
        isLoadingRef.current = false;
        lastSnapshotRef.current = JSON.stringify(canvas.toJSON());
      });
    } else {
      lastSnapshotRef.current = JSON.stringify(canvas.toJSON());
      historyRef.current.clear();
    }

    const handleKey = (e: KeyboardEvent) => {
      // ── Undo / Redo ──
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          // Cmd+Shift+Z = Redo
          if (historyRef.current.canRedo) {
            historyRef.current.redo(canvas);
            triggerAutoSave();
            const json = getCanvasJSON();
            if (json) lastSnapshotRef.current = JSON.stringify(json);
          }
        } else {
          // Cmd+Z = Undo
          if (historyRef.current.canUndo) {
            historyRef.current.undo(canvas);
            triggerAutoSave();
            const json = getCanvasJSON();
            if (json) lastSnapshotRef.current = JSON.stringify(json);
          }
        }
        return;
      }

      // ── Copy ──
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const active = canvas.getActiveObject();
        if (!active || active.data?.isGrid || active.data?.isLightingOverlay) return;

        // Handle lighting objects — store zone data for duplication
        if (active.data?.isLighting) {
          const zoneId = active.data.zoneId;
          const zone = lightingZonesRef.current.find((z) => z.id === zoneId);
          if (zone) {
            clipboardLightingRef.current = [zone];
            clipboardRef.current = [];
            setCanPaste(true);
          }
          return;
        }

        clipboardLightingRef.current = [];
        if (active instanceof ActiveSelection) {
          clipboardRef.current = active.getObjects()
            .filter((o) => !o.data?.isGrid && !o.data?.isLighting && !o.data?.isLightingOverlay && !o.data?.isRoom)
            .map((o) => o.toJSON());
        } else {
          clipboardRef.current = [active.toJSON()];
        }
        setCanPaste(clipboardRef.current.length > 0);
      }

      // ── Paste ──
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && (clipboardRef.current.length > 0 || clipboardLightingRef.current.length > 0)) {
        e.preventDefault();

        // Paste lighting zones — duplicate with new ID and offset position
        if (clipboardLightingRef.current.length > 0 && onUpdateZonesRef.current && lightingZonesRef.current) {
          const newZones = clipboardLightingRef.current.map((zone) => ({
            ...zone,
            id: crypto.randomUUID(),
            name: zone.name + " (copy)",
            x: Math.min(zone.x + 5, 95),
            y: Math.min(zone.y + 5, 95),
          }));
          onUpdateZonesRef.current([...lightingZonesRef.current, ...newZones]);
          return;
        }

        util.enlivenObjects(clipboardRef.current).then((objects: any[]) => {
          const ids: string[] = [];
          objects.forEach((obj) => {
            obj.data = { ...obj.data, _objectId: undefined };
            ensureObjectId(obj);
            ids.push(obj.data._objectId);
            obj.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
            canvas.add(obj);
          });
          canvas.requestRenderAll();
          pushCommand(new AddCommand(ids, objects));
          const json = getCanvasJSON();
          if (json) lastSnapshotRef.current = JSON.stringify(json);
          triggerAutoSave();
        }).catch((err) => {
          console.error("[FloorPlan] Paste failed:", err);
        });
      }

      // ── Select All ──
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const furniture = canvas.getObjects().filter((o) =>
          o.data && !o.data.isGrid && !o.data.isRoom && !o.data.isLighting && !o.data.isLightingOverlay
        );
        if (furniture.length > 0) {
          const sel = new ActiveSelection(furniture, { canvas });
          canvas.setActiveObject(sel);
          canvas.requestRenderAll();
        }
      }

      // ── Delete / Backspace ──
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        if (active.data?.isGrid || active.data?.isLightingOverlay) return;

        if (active instanceof ActiveSelection) {
          const objects = active.getObjects().filter(
            (o) => !o.data?.isGrid && !o.data?.isLighting && !o.data?.isLightingOverlay && !o.data?.isRoom
          );
          const ids = objects.map((o) => ensureObjectId(o));
          canvas.discardActiveObject();
          objects.forEach((o) => canvas.remove(o));
          pushCommand(new RemoveCommand(ids, objects));
          const json = getCanvasJSON();
          if (json) lastSnapshotRef.current = JSON.stringify(json);
          triggerAutoSave();
          return;
        }

        if (active.data?.isLighting) {
          const zoneId = active.data.zoneId;
          if (onUpdateZonesRef.current && lightingZonesRef.current) {
            onUpdateZonesRef.current(lightingZonesRef.current.filter((z) => z.id !== zoneId));
          }
          if (onSelectZoneRef.current) onSelectZoneRef.current(null);
          canvas.discardActiveObject();
          return;
        }

        const id = ensureObjectId(active);
        canvas.remove(active);
        canvas.discardActiveObject();
        pushCommand(new RemoveCommand([id], [active]));
        const json = getCanvasJSON();
        if (json) lastSnapshotRef.current = JSON.stringify(json);
        triggerAutoSave();
      }
    };
    window.addEventListener("keydown", handleKey);

    // Resize: reposition grid (cached objects) instead of recreating
    const resizeObserver = new ResizeObserver(() => {
      const newW = Math.max(container.clientWidth, 1400);
      const newH = Math.max(container.clientHeight, 900);
      canvas.setDimensions({ width: newW, height: newH });

      // Recreate grid for new dimensions
      createGrid(canvas, newW, newH);

      // Re-sync lighting (percentage-based positions need recalculation)
      syncLightingToCanvas();

      canvas.requestRenderAll();
    });
    resizeObserver.observe(container);

    return () => {
      window.removeEventListener("keydown", handleKey);
      resizeObserver.disconnect();
      clearAngleGuide();
      disposeGuides(canvas);
      disposeDistanceIndicators(canvas);
      // Remove all canvas event listeners to prevent accumulation on remount
      canvas.off();
      // Cancel pending debounces
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      // Flush save — persist current canvas state before disposing
      // Skip if canvas is still loading (loadFromJSON hasn't resolved yet) —
      // saving here would serialize an empty canvas and overwrite real data.
      if (!isLoadingRef.current) {
        try {
          const allObjs = canvas.getObjects();
          const lightingObjs = allObjs.filter((o: any) => o.data?.isLighting);
          const guideObjs = allObjs.filter((o: any) => o.data?.isGuide);
          const gridObjs = gridObjectsRef.current.filter((o) => allObjs.includes(o));
          const overlayObj = lightingOverlayRef.current;
          // Count user objects (exclude grid, lighting, guides, room backdrop)
          const userObjCount = allObjs.length - lightingObjs.length - guideObjs.length - gridObjs.length - (overlayObj && allObjs.includes(overlayObj) ? 1 : 0);
          // Only save if there are actual user objects — prevents overwriting real data with empty canvas
          if (userObjCount > 0) {
            lightingObjs.forEach((o) => canvas.remove(o));
            guideObjs.forEach((o) => canvas.remove(o));
            gridObjs.forEach((o) => canvas.remove(o));
            if (overlayObj) canvas.remove(overlayObj);
            const rawJSON = canvas.toJSON();
            (rawJSON as any).width = canvas.getWidth();
            (rawJSON as any).height = canvas.getHeight();
            const serialized = serializeFloorPlan(rawJSON as Record<string, unknown>);
            if (serialized) {
              onSaveRef.current?.(serialized);
            }
          }
        } catch {
          // Canvas may already be partially disposed — best-effort save
        }
      }
      canvas.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync grid visibility when snap changes ──
  useEffect(() => {
    gridObjectsRef.current.forEach((o) => o.set("visible", snapEnabled));
    fabricRef.current?.requestRenderAll();
  }, [snapEnabled]);

  // ── Sync lighting zones to canvas when zones/selection/enabled changes ──
  useEffect(() => {
    syncLightingToCanvas();
  }, [lightingZones, lightingEnabled, selectedZoneId, syncLightingToCanvas]);

  function applyRoomPreset(preset: RoomPreset, skipSave = false) {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const existing = canvas.getObjects().filter((o: any) => o.data?.isRoom);
    existing.forEach((o: any) => canvas.remove(o));

    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    const points = preset.points.map(([x, y]) => ({ x, y }));

    const polygon = new Polygon(points, {
      left: Math.round((cw - preset.width) / 2 / GRID_SIZE) * GRID_SIZE,
      top: Math.round((ch - preset.height) / 2 / GRID_SIZE) * GRID_SIZE,
      fill: "rgba(250, 247, 242, 0.55)",
      stroke: "#a89070",
      strokeWidth: 2,
      selectable: true,
      evented: true,
      data: { isRoom: true },
      objectCaching: false,
    });

    canvas.add(polygon);
    canvas.sendObjectToBack(polygon);
    gridObjectsRef.current.forEach((o) => canvas.sendObjectToBack(o));

    if (!skipSave) {
      canvas.requestRenderAll();
      pushUndo();
      triggerAutoSave();
      setShowRoomPicker(false);
    }
  }

  function applyCustomRoom() {
    const wFeet = parseFloat(customRoomWidth);
    const hFeet = parseFloat(customRoomHeight);
    if (!wFeet || !hFeet || wFeet < 5 || hFeet < 5) return;
    const wPx = Math.round(wFeet * 12); // 1px = 1 inch
    const hPx = Math.round(hFeet * 12);
    const preset: RoomPreset = {
      id: "custom",
      name: `Custom ${wFeet}' × ${hFeet}'`,
      width: wPx,
      height: hPx,
      points: [[0, 0], [wPx, 0], [wPx, hPx], [0, hPx]],
    };
    applyRoomPreset(preset);
  }

  function applyLayoutTemplate(template: LayoutTemplate) {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Confirm before clearing existing furniture
    const existingFurniture = canvas.getObjects().filter((o: any) =>
      o.data && !o.data.isGrid && !o.data.isLighting && !o.data.isLightingOverlay && !o.data.isGuide && !o.data.isRoom
    );
    if (existingFurniture.length > 0) {
      const ok = window.confirm(
        `Applying "${template.name}" will replace ${existingFurniture.length} existing furniture item(s). Continue?`
      );
      if (!ok) return;
    }

    // 1. Clear existing furniture (keep grid, lighting, guides)
    existingFurniture.forEach((o: any) => canvas.remove(o));

    // 2. Apply room preset (skipSave — we save once at the end)
    const roomPreset = ROOM_PRESETS.find((p) => p.id === template.roomPreset);
    if (roomPreset) {
      applyRoomPreset(roomPreset, true);
    }

    // 3. Compute room offset — template coordinates are relative to room origin (0,0)
    //    so we need to offset them by where the room was actually placed on the canvas
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    const roomOffX = roomPreset ? Math.round((cw - roomPreset.width) / 2 / GRID_SIZE) * GRID_SIZE : 0;
    const roomOffY = roomPreset ? Math.round((ch - roomPreset.height) / 2 / GRID_SIZE) * GRID_SIZE : 0;

    // 4. Place all furniture items (skipSave — batch operation)
    for (const placement of template.placements) {
      const absX = placement.x + roomOffX;
      const absY = placement.y + roomOffY;

      if (placement.isGroup) {
        const group = FURNITURE_GROUPS.find((g) => g.id === placement.itemId);
        if (group) {
          const obj = addFurnitureGroup(group, absX, absY, true);
          if (obj && placement.angle) {
            obj.rotate(placement.angle);
            obj.setCoords();
          }
        }
      } else {
        const item = getFurnitureById(placement.itemId);
        if (item) {
          const obj = addFurnitureToCanvas(item, absX, absY, true);
          if (obj && placement.angle) {
            obj.rotate(placement.angle);
            obj.setCoords();
          }
        }
      }
    }

    canvas.requestRenderAll();
    pushUndo();
    triggerAutoSave();
    setShowLayoutPicker(false);
  }

  function clearRoomShape() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const existing = canvas.getObjects().filter((o: any) => o.data?.isRoom);
    existing.forEach((o: any) => canvas.remove(o));
    canvas.requestRenderAll();
    pushUndo();
    triggerAutoSave();
    setShowRoomPicker(false);
  }

  // findOpenPosition is now imported from @/lib/floorplan/canvas-helpers

  function addFurnitureToCanvas(item: FurnitureItemDef, x?: number, y?: number, skipSave = false): FabricObject | null {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    const defaultX = canvas.getWidth() / 2;
    const defaultY = canvas.getHeight() / 2;
    // If no explicit position, find an open spot near center
    const pos = (x != null && y != null) ? { x, y } : findOpenPosition(canvas, defaultX, defaultY);
    const centerX = pos.x;
    const centerY = pos.y;

    let shape: FabricObject;
    if (item.shape === "circle") {
      shape = new Circle({
        radius: item.defaultRadius || (item.defaultWidth ?? 40) / 2,
        fill: item.fill,
        stroke: item.stroke,
        strokeWidth: 1.5,
        originX: "center",
        originY: "center",
      });
    } else {
      shape = new Rect({
        width: item.defaultWidth ?? 40,
        height: item.defaultHeight ?? 24,
        fill: item.fill,
        stroke: item.stroke,
        strokeWidth: 1.5,
        rx: 4,
        ry: 4,
        originX: "center",
        originY: "center",
      });
    }

    // Scale font to fit inside the shape — clamp between 5 and 9
    const itemWidth = item.defaultWidth ?? 40;
    const labelFontSize = Math.max(5, Math.min(9, Math.floor(itemWidth / 8)));

    const label = new FabricText(item.name, {
      fontSize: labelFontSize,
      fill: "#57534e",
      originX: "center",
      originY: "center",
      fontFamily: "sans-serif",
    });

    const group = new Group([shape, label], {
      left: Math.round(centerX / GRID_SIZE) * GRID_SIZE,
      top: Math.round(centerY / GRID_SIZE) * GRID_SIZE,
      originX: "center",
      originY: "center",
      data: { furnitureId: item.id, label: item.name, tableId: uuid() },
    });

    ensureObjectId(group);
    canvas.add(group);
    if (!skipSave) {
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
      pushCommand(new AddCommand([group.data!._objectId], [group]));
      const json = getCanvasJSON();
      if (json) lastSnapshotRef.current = JSON.stringify(json);
      triggerAutoSave();
      setShowMobilePalette(false);
    }
    return group;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Guest drop from seating panel — find table under cursor
    const guestId = e.dataTransfer.getData("application/x-guest-id");
    if (guestId && onGuestDrop) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dropX = (e.clientX - rect.left) / zoom;
      const dropY = (e.clientY - rect.top) / zoom;

      // Walk canvas objects to find the table (or table-set group) under the drop point
      const allObjects = canvas.getObjects();
      let foundTableId: string | null = null;

      for (let i = allObjects.length - 1; i >= 0; i--) {
        const obj = allObjects[i];
        if (!obj.data) continue;
        // Skip non-furniture (grid, room walls, lighting)
        if (obj.data.isGrid || obj.data.isRoom) continue;

        // Check if drop point is within this object's bounding box
        if (!obj.containsPoint({ x: dropX, y: dropY } as any)) continue;

        // Table-set groups
        if (obj.data.isTableSet && obj.data.tableId) {
          foundTableId = obj.data.tableId;
          break;
        }

        // Individual table objects
        if (obj.data.furnitureId && obj.data.tableId) {
          foundTableId = obj.data.tableId;
          break;
        }
      }

      if (foundTableId) {
        onGuestDrop(guestId, foundTableId);
      }
      return;
    }

    // Furniture drop from palette
    const furnitureId = e.dataTransfer.getData("furnitureId");
    if (!furnitureId) return;
    const item = getFurnitureById(furnitureId);
    if (!item) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    addFurnitureToCanvas(item, (e.clientX - rect.left) / zoom, (e.clientY - rect.top) / zoom);
  }

  function handleUndo() {
    const canvas = fabricRef.current;
    if (!canvas || !historyRef.current.canUndo) return;
    historyRef.current.undo(canvas);
    triggerAutoSave();
    // Update snapshot ref after undo
    const json = getCanvasJSON();
    if (json) lastSnapshotRef.current = JSON.stringify(json);
  }

  function handleRedo() {
    const canvas = fabricRef.current;
    if (!canvas || !historyRef.current.canRedo) return;
    historyRef.current.redo(canvas);
    triggerAutoSave();
    const json = getCanvasJSON();
    if (json) lastSnapshotRef.current = JSON.stringify(json);
  }

  function handleZoomIn() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    canvas.setZoom(newZoom);
    setZoom(newZoom);
  }

  function handleZoomOut() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.3);
    canvas.setZoom(newZoom);
    setZoom(newZoom);
  }

  function handleExport() {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Hide grid
    gridObjectsRef.current.forEach((o) => o.set("visible", false));

    // Lighting zones are already on the canvas — they'll be included in export!
    canvas.requestRenderAll();
    const dataURL = canvas.toDataURL({ format: "png", multiplier: 2 });
    const link = document.createElement("a");
    link.download = `floorplan-${eventId}.png`;
    link.href = dataURL;
    link.click();

    // Restore grid
    gridObjectsRef.current.forEach((o) => o.set("visible", snapEnabled));
    canvas.requestRenderAll();
  }

  function handleDeleteSelected() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    // Don't delete grid or overlay
    if (active.data?.isGrid || active.data?.isLightingOverlay) return;

    // Multi-select delete
    if (active instanceof ActiveSelection) {
      const objects = active.getObjects().filter(
        (o) => !o.data?.isGrid && !o.data?.isLighting && !o.data?.isLightingOverlay && !o.data?.isRoom
      );
      const ids = objects.map((o) => ensureObjectId(o));
      canvas.discardActiveObject();
      objects.forEach((o) => canvas.remove(o));
      setSelectedInfo(null);
      pushCommand(new RemoveCommand(ids, objects));
      const json = getCanvasJSON();
      if (json) lastSnapshotRef.current = JSON.stringify(json);
      triggerAutoSave();
      return;
    }

    // Lighting zone
    if (active.data?.isLighting) {
      const zoneId = active.data.zoneId;
      if (onUpdateZones) {
        onUpdateZones(lightingZones.filter((z) => z.id !== zoneId));
      }
      if (onSelectZone) onSelectZone(null);
      canvas.discardActiveObject();
      return;
    }

    // Furniture
    const id = ensureObjectId(active);
    canvas.remove(active);
    canvas.discardActiveObject();
    setSelectedInfo(null);
    pushCommand(new RemoveCommand([id], [active]));
    const json = getCanvasJSON();
    if (json) lastSnapshotRef.current = JSON.stringify(json);
    triggerAutoSave();
  }

  function handleAssignTablescapeToSelected(tablescapeId: string | null) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || !active.data) return;

    // Update the Fabric.js object's data
    active.data = { ...active.data, tablescapeId: tablescapeId || undefined };
    canvas.requestRenderAll();

    // Update the properties panel
    if (selectedInfo) {
      setSelectedInfo({ ...selectedInfo, tablescapeId: tablescapeId || undefined });
    }

    // Notify parent so it can persist (via canvas JSON auto-save)
    if (onAssignTablescape && active.data.tableId) {
      onAssignTablescape(active.data.tableId, tablescapeId);
    }

    pushUndo();
    triggerAutoSave();
  }

  function handleRotateSelected() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.data?.isLighting) return;

    const step = rotationSnap ? rotationSnap : 45;
    const ids: string[] = [];
    const fromAngles: number[] = [];
    const toAngles: number[] = [];

    if (active instanceof ActiveSelection) {
      active.getObjects().forEach((obj) => {
        const fromAngle = obj.angle || 0;
        const toAngle = fromAngle + step;
        ids.push(ensureObjectId(obj));
        fromAngles.push(fromAngle);
        toAngles.push(toAngle);
        obj.rotate(toAngle);
      });
    } else {
      const fromAngle = active.angle || 0;
      const toAngle = fromAngle + step;
      ids.push(ensureObjectId(active));
      fromAngles.push(fromAngle);
      toAngles.push(toAngle);
      active.rotate(toAngle);
    }
    canvas.requestRenderAll();

    if (selectedInfo && !(active instanceof ActiveSelection)) {
      const bound = active.getBoundingRect();
      setSelectedInfo({
        ...selectedInfo,
        angle: active.angle || 0,
        x: active.left || 0,
        y: active.top || 0,
        width: bound.width / (canvas.getZoom?.() || 1),
        height: bound.height / (canvas.getZoom?.() || 1),
      });
    }

    pushCommand(new RotateCommand(ids, fromAngles, toAngles));
    const json = getCanvasJSON();
    if (json) lastSnapshotRef.current = JSON.stringify(json);
    triggerAutoSave();
  }

  function handleCopy() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.data?.isGrid || active.data?.isLightingOverlay) return;

    // Handle lighting objects
    if (active.data?.isLighting) {
      const zoneId = active.data.zoneId;
      const zone = lightingZonesRef.current.find((z) => z.id === zoneId);
      if (zone) {
        clipboardLightingRef.current = [zone];
        clipboardRef.current = [];
        setCanPaste(true);
      }
      return;
    }

    clipboardLightingRef.current = [];
    if (active instanceof ActiveSelection) {
      clipboardRef.current = active.getObjects()
        .filter((o) => !o.data?.isGrid && !o.data?.isLighting && !o.data?.isLightingOverlay && !o.data?.isRoom)
        .map((o) => o.toJSON());
    } else {
      clipboardRef.current = [active.toJSON()];
    }
    setCanPaste(clipboardRef.current.length > 0);
  }

  function handlePaste() {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Paste lighting zones
    if (clipboardLightingRef.current.length > 0 && onUpdateZonesRef.current && lightingZonesRef.current) {
      const newZones = clipboardLightingRef.current.map((zone) => ({
        ...zone,
        id: crypto.randomUUID(),
        name: zone.name + " (copy)",
        x: Math.min(zone.x + 5, 95),
        y: Math.min(zone.y + 5, 95),
      }));
      onUpdateZonesRef.current([...lightingZonesRef.current, ...newZones]);
      return;
    }

    if (clipboardRef.current.length === 0) return;
    util.enlivenObjects(clipboardRef.current).then((objects: any[]) => {
      const ids: string[] = [];
      objects.forEach((obj) => {
        // Give pasted objects new IDs (they're copies, not the originals)
        obj.data = { ...obj.data, _objectId: undefined };
        ensureObjectId(obj);
        ids.push(obj.data._objectId);
        obj.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
        canvas.add(obj);
      });
      canvas.requestRenderAll();
      pushCommand(new AddCommand(ids, objects));
      const json = getCanvasJSON();
      if (json) lastSnapshotRef.current = JSON.stringify(json);
      triggerAutoSave();
    }).catch((err) => {
      console.error("[FloorPlan] Paste failed:", err);
    });
  }

  function clearMeasureObjects() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    for (const obj of measureObjectsRef.current) {
      canvas.remove(obj);
    }
    measureObjectsRef.current = [];
    measurePointRef.current = null;
    canvas.requestRenderAll();
  }

  function handleMeasureClick(x: number, y: number) {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (!measurePointRef.current) {
      // First click — store the point and show a dot
      measurePointRef.current = { x, y };
      const dot = new Circle({
        left: x,
        top: y,
        radius: 4,
        fill: "#ef4444",
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
        data: { isMeasure: true },
      });
      canvas.add(dot);
      measureObjectsRef.current.push(dot);
      canvas.requestRenderAll();
    } else {
      // Second click — draw line and label
      const p1 = measurePointRef.current;
      const p2 = { x, y };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const label = pxToFeetInches(distPx);

      const line = new Line([p1.x, p1.y, p2.x, p2.y], {
        stroke: "#ef4444",
        strokeWidth: 2,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
        data: { isMeasure: true },
      });

      const dot2 = new Circle({
        left: p2.x,
        top: p2.y,
        radius: 4,
        fill: "#ef4444",
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
        data: { isMeasure: true },
      });

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      // Offset label perpendicular to the line
      const perpX = -Math.sin(angle * Math.PI / 180) * 14;
      const perpY = Math.cos(angle * Math.PI / 180) * 14;

      const text = new FabricText(label, {
        left: midX + perpX,
        top: midY + perpY,
        fontSize: 14,
        fontFamily: "sans-serif",
        fontWeight: "700",
        fill: "#ef4444",
        backgroundColor: "rgba(255,255,255,0.85)",
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
        data: { isMeasure: true },
      });

      canvas.add(line, dot2, text);
      measureObjectsRef.current.push(line, dot2, text);
      canvas.requestRenderAll();

      // Reset for next measurement (keep previous measurements visible)
      measurePointRef.current = null;
    }
  }

  function addFurnitureGroup(group: FurnitureGroup, x?: number, y?: number, skipSave = false): FabricObject | null {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    const defaultX = canvas.getWidth() / 2;
    const defaultY = canvas.getHeight() / 2;
    const pos = (x != null && y != null) ? { x, y } : findOpenPosition(canvas, defaultX, defaultY);
    const centerX = pos.x;
    const centerY = pos.y;

    // Build all sub-objects relative to (0,0), then wrap in one Group
    const subObjects: FabricObject[] = [];
    // Track the first (primary) item for labeling the group
    let primaryItemId: string | null = null;

    group.items.forEach((entry, idx) => {
      const item = getFurnitureById(entry.furnitureId);
      if (!item) return;
      if (idx === 0) primaryItemId = item.id;

      const isChair = entry.furnitureId === "chair";

      let shape: FabricObject;
      if (item.shape === "circle") {
        shape = new Circle({
          radius: item.defaultRadius || (item.defaultWidth ?? 40) / 2,
          fill: item.fill,
          stroke: item.stroke,
          strokeWidth: isChair ? 1 : 1.5,
          originX: "center",
          originY: "center",
        });
      } else {
        shape = new Rect({
          width: item.defaultWidth ?? 40,
          height: item.defaultHeight ?? 24,
          fill: item.fill,
          stroke: item.stroke,
          strokeWidth: isChair ? 1 : 1.5,
          rx: isChair ? 3 : 4,
          ry: isChair ? 3 : 4,
          originX: "center",
          originY: "center",
        });
      }

      // Only label the primary table, not individual chairs
      if (!isChair) {
        const label = new FabricText(item.name, {
          fontSize: 9,
          fill: "#57534e",
          originX: "center",
          originY: "center",
          fontFamily: "sans-serif",
        });
        const itemGroup = new Group([shape, label], {
          left: entry.offsetX,
          top: entry.offsetY,
          originX: "center",
          originY: "center",
          angle: entry.angle || 0,
          data: { furnitureId: item.id, label: item.name, tableId: uuid() },
        });
        subObjects.push(itemGroup);
      } else {
        // Chairs: just the shape, no label — cleaner look
        const chairGroup = new Group([shape], {
          left: entry.offsetX,
          top: entry.offsetY,
          originX: "center",
          originY: "center",
          angle: entry.angle || 0,
          data: { furnitureId: item.id },
        });
        subObjects.push(chairGroup);
      }
    });

    if (subObjects.length === 0) return null;

    // Wrap everything in a single group that moves/selects together
    const snappedX = Math.round(centerX / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(centerY / GRID_SIZE) * GRID_SIZE;

    const combinedGroup = new Group(subObjects, {
      left: snappedX,
      top: snappedY,
      originX: "center",
      originY: "center",
      data: {
        furnitureId: primaryItemId || group.items[0]?.furnitureId,
        label: group.name,
        isTableSet: true,
        groupId: group.id,
        tableId: uuid(),
      },
    });

    ensureObjectId(combinedGroup);
    canvas.add(combinedGroup);
    if (!skipSave) {
      canvas.setActiveObject(combinedGroup);
      canvas.requestRenderAll();
      pushCommand(new AddCommand([combinedGroup.data!._objectId], [combinedGroup]));
      const json = getCanvasJSON();
      if (json) lastSnapshotRef.current = JSON.stringify(json);
      triggerAutoSave();
      setShowMobilePalette(false);
    }
    return combinedGroup;
  }

  function handleUpdateLabel(label: string) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && active instanceof Group) {
      // For table sets the text lives inside a nested sub-group, so search recursively
      const findText = (group: Group): FabricText | undefined => {
        for (const child of group.getObjects()) {
          if (child instanceof FabricText) return child;
          if (child instanceof Group) {
            const found = findText(child);
            if (found) return found;
          }
        }
        return undefined;
      };
      const textObj = findText(active);
      if (textObj) textObj.set("text", label);
      active.data = { ...active.data, label };
      // Also update the nested sub-group's data.label (for table sets)
      if (active.data?.isTableSet) {
        for (const child of active.getObjects()) {
          if (child instanceof Group && child.data?.furnitureId && child.data.furnitureId !== "chair") {
            child.data = { ...child.data, label };
            break;
          }
        }
      }
      canvas.requestRenderAll();
      triggerAutoSave();
    }
  }

  function handleUpdateAngle(angle: number) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      active.rotate(angle);
      canvas.requestRenderAll();
      triggerAutoSave();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        rotationSnap={rotationSnap}
        onCycleRotationSnap={() => {
          setRotationSnap((prev) => {
            if (prev === false) return 15; // Off → 15°
            const opts = ROTATION_SNAP_OPTIONS;
            const idx = opts.indexOf(prev);
            const nextIdx = idx + 1;
            if (nextIdx >= opts.length) return false; // Past last angle → Off
            return opts[nextIdx]; // Next angle
          });
        }}
        onLayoutTemplate={() => setShowLayoutPicker(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyRef.current.canUndo}
        canRedo={historyRef.current.canRedo}
        alignmentEnabled={alignmentEnabled}
        onToggleAlignment={() => setAlignmentEnabled(!alignmentEnabled)}
        collisionEnabled={collisionEnabled}
        onToggleCollision={() => setCollisionEnabled(!collisionEnabled)}
        onExport={handleExport}
        onDeleteSelected={handleDeleteSelected}
        onRotateSelected={handleRotateSelected}
        hasSelection={selectedInfo !== null}
        zoom={zoom}
        onRoomShape={() => setShowRoomPicker(true)}
        onCopy={handleCopy}
        onPaste={handlePaste}
        canPaste={canPaste}
        onManualSave={handleManualSave}
        saveStatus={saveStatus}
        measureMode={measureMode}
        onToggleMeasure={() => setMeasureMode((m) => !m)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop side panels — height bounded so palette scrolls */}
        <div className="hidden md:block h-full overflow-hidden">
          <FurniturePalette onAddItem={(item) => addFurnitureToCanvas(item)} onAddGroup={(group) => addFurnitureGroup(group)} />
        </div>

        <div
          ref={containerRef}
          className="flex-1 bg-stone-100 overflow-auto relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <canvas ref={canvasRef} />
        </div>

        <div className="hidden md:block h-full">
          <PropertiesPanel
            selected={selectedInfo}
            onUpdateLabel={handleUpdateLabel}
            onUpdateAngle={handleUpdateAngle}
            onDelete={handleDeleteSelected}
            rotationSnap={rotationSnap}
            tablescapes={tablescapes}
            onAssignTablescape={handleAssignTablescapeToSelected}
          />
        </div>

        {/* Mobile: FAB to open palette */}
        <button
          onClick={() => setShowMobilePalette(true)}
          className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-rose-400 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>

        {/* Mobile palette bottom sheet */}
        {showMobilePalette && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-stone-900/20 z-40"
              onClick={() => setShowMobilePalette(false)}
            />
            <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[65vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="text-sm font-heading font-semibold text-stone-800 pt-2">
                  Add Furniture
                </h3>
                <button
                  onClick={() => setShowMobilePalette(false)}
                  className="text-stone-400 hover:text-stone-600 pt-2"
                >
                  <X size={18} />
                </button>
              </div>
              <FurniturePalette
                onAddItem={(item) => addFurnitureToCanvas(item)}
                onAddGroup={(group) => addFurnitureGroup(group)}
                mobile
              />
            </div>
          </>
        )}

        {/* Mobile properties bottom sheet */}
        {selectedInfo && (
          <div className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-white rounded-t-2xl shadow-xl">
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mt-2 mb-1" />
            <PropertiesPanel
              selected={selectedInfo}
              onUpdateLabel={handleUpdateLabel}
              onUpdateAngle={handleUpdateAngle}
              onDelete={handleDeleteSelected}
              rotationSnap={rotationSnap}
              mobile
              tablescapes={tablescapes}
              onAssignTablescape={handleAssignTablescapeToSelected}
            />
          </div>
        )}
      </div>

      {/* ─── Layout Template Picker Modal ─── */}
      {showLayoutPicker && (
        <>
          <div
            className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm z-50"
            onClick={() => setShowLayoutPicker(false)}
          />
          <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
            <div className="pointer-events-auto w-full md:w-auto md:min-w-[560px] md:max-w-2xl bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2 md:hidden" />
                <h2 className="font-heading text-base font-semibold text-stone-800 pt-1 md:pt-0">
                  Layout Templates
                </h2>
                <button
                  onClick={() => setShowLayoutPicker(false)}
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-xs text-stone-400 mb-4">
                  Choose a pre-built layout to quickly set up your floor plan. This will replace existing furniture.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {LAYOUT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyLayoutTemplate(template)}
                      className="group flex flex-col gap-1.5 p-4 rounded-xl border border-stone-200 hover:border-violet-300 hover:bg-violet-50/40 transition-all active:scale-[0.98] text-left"
                    >
                      <span className="text-sm font-semibold text-stone-700 group-hover:text-violet-700 transition-colors">
                        {template.name}
                      </span>
                      <span className="text-xs text-stone-400 group-hover:text-stone-500 leading-relaxed">
                        {template.description}
                      </span>
                      <span className="text-[10px] text-stone-300 mt-1">
                        {template.placements.length} items
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Room Shape Picker Modal ─── */}
      {showRoomPicker && (
        <>
          <div
            className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm z-50"
            onClick={() => setShowRoomPicker(false)}
          />
          <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
            <div className="pointer-events-auto w-full md:w-auto md:min-w-[520px] md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2 md:hidden" />
                <h2 className="font-heading text-base font-semibold text-stone-800 pt-1 md:pt-0">
                  Choose Room Shape
                </h2>
                <button
                  onClick={() => setShowRoomPicker(false)}
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ROOM_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyRoomPreset(preset)}
                      className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 transition-all active:scale-95"
                    >
                      <RoomShapePreview preset={preset} />
                      <span className="text-xs font-medium text-stone-600 group-hover:text-rose-600 transition-colors">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
                {/* Custom Room Size */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Custom Dimensions</h3>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-stone-400 mb-1 block">Width (ft)</label>
                      <input
                        type="number"
                        min={5}
                        max={200}
                        value={customRoomWidth}
                        onChange={(e) => setCustomRoomWidth(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                        placeholder="50"
                      />
                    </div>
                    <span className="text-stone-300 pb-1.5 text-sm">×</span>
                    <div className="flex-1">
                      <label className="text-xs text-stone-400 mb-1 block">Depth (ft)</label>
                      <input
                        type="number"
                        min={5}
                        max={200}
                        value={customRoomHeight}
                        onChange={(e) => setCustomRoomHeight(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                        placeholder="30"
                      />
                    </div>
                    <button
                      onClick={applyCustomRoom}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-xs text-stone-400 mt-2">
                    {customRoomWidth && customRoomHeight
                      ? `${parseFloat(customRoomWidth) * parseFloat(customRoomHeight)} sq ft — ${parseFloat(customRoomWidth) * 12}" × ${parseFloat(customRoomHeight) * 12}"`
                      : "Enter dimensions in feet"}
                  </p>
                </div>
                <button
                  onClick={clearRoomShape}
                  className="mt-3 w-full py-2.5 text-sm text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-xl border border-dashed border-stone-200 hover:border-stone-300 transition-all"
                >
                  Remove room outline
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
