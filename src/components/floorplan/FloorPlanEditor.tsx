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
  util,
} from "fabric";
import { GRID_SIZE, ROOM_PRESETS, FURNITURE_GROUPS, FurnitureGroup } from "@/lib/constants";
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
import { FurnitureItemDef, LightingZone, RoomPreset } from "@/lib/types";
import { getFurnitureById } from "./furniture-items";
import FurniturePalette from "./FurniturePalette";
import Toolbar, { RotationSnapValue, ROTATION_SNAP_OPTIONS } from "./Toolbar";
import PropertiesPanel from "./PropertiesPanel";
import { Plus, X } from "lucide-react";
import { LAYOUT_TEMPLATES, LayoutTemplate } from "@/lib/layout-templates";

interface Props {
  eventId: string;
  initialJSON: string | null;
  onSave?: (json: string) => void;
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
}

interface SelectedInfo {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  furnitureId: string;
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
  initialJSON,
  onSave,
  lightingZones = [],
  lightingEnabled = false,
  onUpdateZones,
  selectedZoneId = null,
  onSelectZone,
  readOnly = false,
  onCanvasReady,
  onGuestDrop,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [rotationSnap, setRotationSnap] = useState<RotationSnapValue>(15);
  const [zoom, setZoom] = useState(1);
  const [selectedInfo, setSelectedInfo] = useState<SelectedInfo | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const gridObjectsRef = useRef<FabricObject[]>([]);
  const lightingOverlayRef = useRef<Rect | null>(null);
  const lightingObjectsRef = useRef<Map<string, Group>>(new Map());
  const clipboardRef = useRef<any[]>([]);
  const [canPaste, setCanPaste] = useState(false);
  const angleGuideRef = useRef<{ line: FabricObject; text: FabricText } | null>(null);
  const isDraggingLightRef = useRef(false);

  // ── Refs for latest values (used in closures) ──
  const onSaveRef = useRef(onSave);
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
    lightingZonesRef.current = lightingZones;
    lightingEnabledRef.current = lightingEnabled;
    selectedZoneIdRef.current = selectedZoneId;
    onUpdateZonesRef.current = onUpdateZones;
    onSelectZoneRef.current = onSelectZone;
    readOnlyRef.current = readOnly;
    snapEnabledRef.current = snapEnabled;
    rotationSnapRef.current = rotationSnap;
  });

  // ── Serialize canvas excluding lighting objects ──
  const getCanvasJSON = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return null;

    // Temporarily remove non-content objects so they don't get serialized
    const lightingObjs = canvas.getObjects().filter((o: any) => o.data?.isLighting);
    const guideObjs = canvas.getObjects().filter((o: any) => o.data?.isGuide);
    const gridObjs = gridObjectsRef.current.filter((o) => canvas.getObjects().includes(o));
    const overlayObj = lightingOverlayRef.current;
    lightingObjs.forEach((o) => canvas.remove(o));
    guideObjs.forEach((o) => canvas.remove(o));
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

    return rawJSON;
  }, []);

  // ── Undo (debounced — prevents rapid-fire state pushes) ──
  const pushUndo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || isLoadingRef.current) return;

    if (undoDebounceRef.current) clearTimeout(undoDebounceRef.current);
    undoDebounceRef.current = setTimeout(() => {
      const json = getCanvasJSON();
      if (!json) return;
      const str = JSON.stringify(json);
      setUndoStack((prev) => [...prev.slice(-29), str]);
      setRedoStack([]);
    }, 150);
  }, [getCanvasJSON]);

  // ── Save status for manual save feedback ──
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Core save logic — used by both auto-save and manual save */
  const doSave = useCallback(() => {
    const json = getCanvasJSON();
    if (!json) {
      console.warn("[FloorPlan] doSave: getCanvasJSON returned null");
      return false;
    }
    const serialized = serializeFloorPlan(json as Record<string, unknown>);
    if (!serialized) {
      console.warn("[FloorPlan] doSave: serializeFloorPlan returned null (validation failed)");
      return false;
    }
    onSaveRef.current?.(serialized);
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
      if (!snapEnabledRef.current) return;
      const obj = e.target;
      if (!obj) return;

      // Lighting zones: snap to furniture or convert pixel position to percentage
      if (obj.data?.isLighting) {
        isDraggingLightRef.current = true;
        const objLeft = obj.left || 0;
        const objTop = obj.top || 0;

        // Check proximity to furniture objects for snap
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

        // Store snap info on the object for object:modified to read.
        // Don't update React state here — firing on every drag frame
        // causes a state→effect→sync loop that overflows the stack.
        obj.data = { ...obj.data, _snappedLabel: snappedLabel };
        return;
      }

      // Furniture: snap to grid
      obj.set({
        left: Math.round((obj.left || 0) / GRID_SIZE) * GRID_SIZE,
        top: Math.round((obj.top || 0) / GRID_SIZE) * GRID_SIZE,
      });
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
        });
        if (onSelectZoneRef.current) {
          onSelectZoneRef.current(null);
        }
      } else {
        setSelectedInfo(null);
      }
    };

    canvas.on("selection:created", updateSelection);
    canvas.on("selection:updated", updateSelection);
    canvas.on("selection:cleared", () => {
      setSelectedInfo(null);
      if (onSelectZoneRef.current) {
        onSelectZoneRef.current(null);
      }
    });

    canvas.on("object:modified", (e) => {
      // Clear rotation angle guide
      clearAngleGuide();

      const obj = e.target;

      // If lighting zone was moved, persist final position.
      // Do NOT call syncLightingToCanvas() here — the useEffect watching
      // lightingZones will pick up the state change and sync safely.
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
        return; // Don't push undo or save for lighting changes
      }

      pushUndo();
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
        canvas.requestRenderAll();
        isLoadingRef.current = false;
        // Initial undo state (excluding lighting)
        const rawJSON = canvas.toJSON();
        setUndoStack([JSON.stringify(rawJSON)]);
      }).catch((err) => {
        console.error("[FloorPlan] Failed to load canvas JSON:", err);
        isLoadingRef.current = false;
        setUndoStack([JSON.stringify(canvas.toJSON())]);
      });
    } else {
      setUndoStack([JSON.stringify(canvas.toJSON())]);
    }

    const handleKey = (e: KeyboardEvent) => {
      // ── Copy ──
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const active = canvas.getActiveObject();
        if (!active || active.data?.isGrid || active.data?.isLighting || active.data?.isLightingOverlay) return;
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
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboardRef.current.length > 0) {
        e.preventDefault();
        util.enlivenObjects(clipboardRef.current).then((objects: any[]) => {
          objects.forEach((obj) => {
            obj.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
            canvas.add(obj);
          });
          canvas.requestRenderAll();
          pushUndo();
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
        // Don't intercept when typing in an input field
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        // Don't delete grid or overlay
        if (active.data?.isGrid || active.data?.isLightingOverlay) return;

        // Multi-select delete
        if (active instanceof ActiveSelection) {
          const objects = active.getObjects().filter(
            (o) => !o.data?.isGrid && !o.data?.isLighting && !o.data?.isLightingOverlay && !o.data?.isRoom
          );
          canvas.discardActiveObject();
          objects.forEach((o) => canvas.remove(o));
          pushUndo();
          triggerAutoSave();
          return;
        }

        // Delete lighting zone
        if (active.data?.isLighting) {
          const zoneId = active.data.zoneId;
          if (onUpdateZonesRef.current && lightingZonesRef.current) {
            onUpdateZonesRef.current(lightingZonesRef.current.filter((z) => z.id !== zoneId));
          }
          if (onSelectZoneRef.current) onSelectZoneRef.current(null);
          canvas.discardActiveObject();
          return;
        }

        // Delete furniture
        canvas.remove(active);
        canvas.discardActiveObject();
        pushUndo();
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
      // Remove all canvas event listeners to prevent accumulation on remount
      canvas.off();
      // Cancel pending debounces
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (undoDebounceRef.current) clearTimeout(undoDebounceRef.current);
      // Flush save — persist current canvas state before disposing
      try {
        const lightingObjs = canvas.getObjects().filter((o: any) => o.data?.isLighting);
        const guideObjs = canvas.getObjects().filter((o: any) => o.data?.isGuide);
        const gridObjs = gridObjectsRef.current.filter((o) => canvas.getObjects().includes(o));
        const overlayObj = lightingOverlayRef.current;
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
      } catch {
        // Canvas may already be partially disposed — best-effort save
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

  /** Find a non-overlapping position near the canvas center for new items */
  function findOpenPosition(canvas: any, preferX: number, preferY: number): { x: number; y: number } {
    const objects = canvas.getObjects().filter((o: any) => o.data && !o.data.isGrid && !o.data.isLighting && !o.data.isLightingOverlay && !o.data.isGuide && !o.data.isRoom);
    const step = GRID_SIZE * 5; // 100px offset per step
    const canvasW = canvas.getWidth();
    const canvasH = canvas.getHeight();
    let x = preferX;
    let y = preferY;
    for (let attempt = 0; attempt < 20; attempt++) {
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
      // Bounds check: keep items within canvas boundaries (with 50px margin)
      if (snappedX < 50 || snappedX > canvasW - 50 || snappedY < 50 || snappedY > canvasH - 50) {
        // Skip out-of-bounds positions, continue spiraling
        x = preferX + step * ((attempt % 4 < 2 ? 1 : -1) * Math.ceil((attempt + 1) / 2));
        y = preferY + step * ((attempt % 2 === 0 ? 0 : 1) * Math.ceil((attempt + 1) / 2));
        continue;
      }
      const tooClose = objects.some((obj: any) => {
        const ox = obj.left || 0;
        const oy = obj.top || 0;
        return Math.abs(ox - snappedX) < step && Math.abs(oy - snappedY) < step;
      });
      if (!tooClose) return { x: snappedX, y: snappedY };
      // Spiral outward: right, then down-right, etc.
      x = preferX + step * ((attempt % 4 < 2 ? 1 : -1) * Math.ceil((attempt + 1) / 2));
      y = preferY + step * ((attempt % 2 === 0 ? 0 : 1) * Math.ceil((attempt + 1) / 2));
    }
    // Clamp final fallback position within canvas bounds
    const finalX = Math.max(50, Math.min(canvasW - 50, Math.round(x / GRID_SIZE) * GRID_SIZE));
    const finalY = Math.max(50, Math.min(canvasH - 50, Math.round(y / GRID_SIZE) * GRID_SIZE));
    return { x: finalX, y: finalY };
  }

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

    canvas.add(group);
    if (!skipSave) {
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
      pushUndo();
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
    if (!canvas || undoStack.length <= 1) return;
    // Flush pending debounced undo push
    if (undoDebounceRef.current) { clearTimeout(undoDebounceRef.current); undoDebounceRef.current = null; }
    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];
    setRedoStack((prev) => [...prev, current]);
    setUndoStack((prev) => prev.slice(0, -1));
    isLoadingRef.current = true;
    // Clear stale refs — loadFromJSON removes all canvas objects
    lightingOverlayRef.current = null;
    lightingObjectsRef.current.clear();
    canvas.loadFromJSON(JSON.parse(previous)).then(() => {
      // Re-add grid (loadFromJSON cleared it)
      createGrid(canvas, canvas.getWidth(), canvas.getHeight());
      canvas.requestRenderAll();
      isLoadingRef.current = false;
      triggerAutoSave();
      syncLightingToCanvas();
    }).catch((err) => {
      console.error("[FloorPlan] Undo failed:", err);
      isLoadingRef.current = false;
    });
  }

  function handleRedo() {
    const canvas = fabricRef.current;
    if (!canvas || redoStack.length === 0) return;
    if (undoDebounceRef.current) { clearTimeout(undoDebounceRef.current); undoDebounceRef.current = null; }
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, next]);
    isLoadingRef.current = true;
    lightingOverlayRef.current = null;
    lightingObjectsRef.current.clear();
    canvas.loadFromJSON(JSON.parse(next)).then(() => {
      createGrid(canvas, canvas.getWidth(), canvas.getHeight());
      canvas.requestRenderAll();
      isLoadingRef.current = false;
      triggerAutoSave();
      syncLightingToCanvas();
    }).catch((err) => {
      console.error("[FloorPlan] Redo failed:", err);
      isLoadingRef.current = false;
    });
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
      canvas.discardActiveObject();
      objects.forEach((o) => canvas.remove(o));
      setSelectedInfo(null);
      pushUndo();
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
    canvas.remove(active);
    canvas.discardActiveObject();
    setSelectedInfo(null);
    pushUndo();
    triggerAutoSave();
  }

  function handleRotateSelected() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.data?.isLighting) return;

    const step = rotationSnap ? rotationSnap : 45;
    if (active instanceof ActiveSelection) {
      active.getObjects().forEach((obj) => {
        obj.rotate((obj.angle || 0) + step);
      });
    } else {
      active.rotate((active.angle || 0) + step);
    }
    canvas.requestRenderAll();

    // Update properties panel to reflect new angle
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

    pushUndo();
    triggerAutoSave();
  }

  function handleCopy() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.data?.isGrid || active.data?.isLighting || active.data?.isLightingOverlay) return;
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
    if (!canvas || clipboardRef.current.length === 0) return;
    util.enlivenObjects(clipboardRef.current).then((objects: any[]) => {
      objects.forEach((obj) => {
        obj.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
        canvas.add(obj);
      });
      canvas.requestRenderAll();
      pushUndo();
      triggerAutoSave();
    }).catch((err) => {
      console.error("[FloorPlan] Paste failed:", err);
    });
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

    canvas.add(combinedGroup);
    if (!skipSave) {
      canvas.setActiveObject(combinedGroup);
      canvas.requestRenderAll();
      pushUndo();
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
            const opts: (RotationSnapValue)[] = [...ROTATION_SNAP_OPTIONS, false];
            const idx = opts.indexOf(prev);
            return opts[(idx + 1) % opts.length];
          });
        }}
        onLayoutTemplate={() => setShowLayoutPicker(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 1}
        canRedo={redoStack.length > 0}
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
