"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Rect, Circle, Group, FabricText, FabricObject, Polygon } from "fabric";
import { GRID_SIZE, ROOM_PRESETS } from "@/lib/constants";

// Ensure custom 'data' property is serialized
const origToObject = FabricObject.prototype.toObject;
FabricObject.prototype.toObject = function (propertiesToInclude?: string[]) {
  return origToObject.call(this, [...(propertiesToInclude || []), "data"]);
};
import { FurnitureItemDef, RoomPreset } from "@/lib/types";
import { getFurnitureById } from "./furniture-items";
import FurniturePalette from "./FurniturePalette";
import Toolbar from "./Toolbar";
import PropertiesPanel from "./PropertiesPanel";
import { Plus, X } from "lucide-react";

interface Props {
  eventId: string;
  initialJSON: string | null;
  onSave: (json: string) => void;
  canvasOverlay?: React.ReactNode;
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

export default function FloorPlanEditor({ eventId, initialJSON, onSave, canvasOverlay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedInfo, setSelectedInfo] = useState<SelectedInfo | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);

  const pushUndo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || isLoadingRef.current) return;
    const json = JSON.stringify(canvas.toJSON());
    setUndoStack((prev) => [...prev.slice(-29), json]);
    setRedoStack([]);
  }, []);

  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const canvas = fabricRef.current;
      if (canvas) {
        onSave(JSON.stringify(canvas.toJSON()));
      }
    }, 800);
  }, [onSave]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const canvas = new Canvas(canvasRef.current, {
      width: w,
      height: h,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;
    drawGrid(canvas, w, h);

    canvas.on("object:moving", (e) => {
      if (!snapEnabled) return;
      const obj = e.target;
      if (!obj) return;
      obj.set({
        left: Math.round((obj.left || 0) / GRID_SIZE) * GRID_SIZE,
        top: Math.round((obj.top || 0) / GRID_SIZE) * GRID_SIZE,
      });
    });

    const updateSelection = () => {
      const active = canvas.getActiveObject();
      // Skip grid lines and room outline — only show props for furniture
      if (active && active.data && !active.data.isGrid && !active.data.isRoom) {
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
      } else {
        setSelectedInfo(null);
      }
    };

    canvas.on("selection:created", updateSelection);
    canvas.on("selection:updated", updateSelection);
    canvas.on("selection:cleared", () => setSelectedInfo(null));
    canvas.on("object:modified", () => {
      pushUndo();
      triggerAutoSave();
      updateSelection();
    });

    if (initialJSON) {
      isLoadingRef.current = true;
      canvas.loadFromJSON(JSON.parse(initialJSON)).then(() => {
        canvas.requestRenderAll();
        isLoadingRef.current = false;
        setUndoStack([JSON.stringify(canvas.toJSON())]);
      });
    } else {
      setUndoStack([JSON.stringify(canvas.toJSON())]);
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = canvas.getActiveObject();
        if (active && !active.data?.isGrid) {
          canvas.remove(active);
          canvas.discardActiveObject();
          pushUndo();
          triggerAutoSave();
        }
      }
    };
    window.addEventListener("keydown", handleKey);

    const resizeObserver = new ResizeObserver(() => {
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      canvas.setDimensions({ width: newW, height: newH });
      const gridObjects = canvas.getObjects().filter((o: any) => o.data?.isGrid);
      gridObjects.forEach((o: any) => canvas.remove(o));
      drawGrid(canvas, newW, newH);
    });
    resizeObserver.observe(container);

    return () => {
      window.removeEventListener("keydown", handleKey);
      resizeObserver.disconnect();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      canvas.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const gridObjects = canvas.getObjects().filter((o: any) => o.data?.isGrid);
    gridObjects.forEach((o: any) => o.set("visible", snapEnabled));
    canvas.requestRenderAll();
  }, [snapEnabled]);

  function drawGrid(canvas: Canvas, w: number, h: number) {
    for (let i = 0; i <= w; i += GRID_SIZE) {
      const line = new Rect({
        left: i, top: 0, width: 0.5, height: h,
        fill: "#e7e5e4",
        selectable: false, evented: false, data: { isGrid: true },
      });
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }
    for (let i = 0; i <= h; i += GRID_SIZE) {
      const line = new Rect({
        left: 0, top: i, width: w, height: 0.5,
        fill: "#e7e5e4",
        selectable: false, evented: false, data: { isGrid: true },
      });
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }
  }

  function applyRoomPreset(preset: RoomPreset) {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Remove any existing room shape
    const existing = canvas.getObjects().filter((o: any) => o.data?.isRoom);
    existing.forEach((o: any) => canvas.remove(o));

    const cw = canvas.getWidth();
    const ch = canvas.getHeight();

    // Points are relative to preset's own 0,0 origin
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

    // Layer order: grid (bottom) → room → furniture (top)
    canvas.sendObjectToBack(polygon);
    const gridObjs = canvas.getObjects().filter((o: any) => o.data?.isGrid);
    gridObjs.forEach((o: any) => canvas.sendObjectToBack(o));

    canvas.requestRenderAll();
    pushUndo();
    triggerAutoSave();
    setShowRoomPicker(false);
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

  function addFurnitureToCanvas(item: FurnitureItemDef, x?: number, y?: number) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const centerX = x ?? canvas.getWidth() / 2;
    const centerY = y ?? canvas.getHeight() / 2;

    let shape: FabricObject;
    if (item.shape === "circle") {
      shape = new Circle({
        radius: item.defaultRadius || item.defaultWidth / 2,
        fill: item.fill, stroke: item.stroke, strokeWidth: 1.5,
        originX: "center", originY: "center",
      });
    } else {
      shape = new Rect({
        width: item.defaultWidth, height: item.defaultHeight,
        fill: item.fill, stroke: item.stroke, strokeWidth: 1.5,
        rx: 4, ry: 4, originX: "center", originY: "center",
      });
    }

    const label = new FabricText(item.name, {
      fontSize: 9, fill: "#57534e", originX: "center", originY: "center",
      fontFamily: "sans-serif",
    });

    const group = new Group([shape, label], {
      left: Math.round(centerX / GRID_SIZE) * GRID_SIZE,
      top: Math.round(centerY / GRID_SIZE) * GRID_SIZE,
      originX: "center", originY: "center",
      data: { furnitureId: item.id, label: item.name },
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    pushUndo();
    triggerAutoSave();
    setShowMobilePalette(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const canvas = fabricRef.current;
    if (!canvas) return;
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
    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];
    setRedoStack((prev) => [...prev, current]);
    setUndoStack((prev) => prev.slice(0, -1));
    isLoadingRef.current = true;
    canvas.loadFromJSON(JSON.parse(previous)).then(() => {
      canvas.requestRenderAll();
      isLoadingRef.current = false;
      triggerAutoSave();
    });
  }

  function handleRedo() {
    const canvas = fabricRef.current;
    if (!canvas || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, next]);
    isLoadingRef.current = true;
    canvas.loadFromJSON(JSON.parse(next)).then(() => {
      canvas.requestRenderAll();
      isLoadingRef.current = false;
      triggerAutoSave();
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
    const gridObjects = canvas.getObjects().filter((o: any) => o.data?.isGrid);
    gridObjects.forEach((o: any) => o.set("visible", false));
    canvas.requestRenderAll();
    const dataURL = canvas.toDataURL({ format: "png", multiplier: 2 });
    const link = document.createElement("a");
    link.download = `floorplan-${eventId}.png`;
    link.href = dataURL;
    link.click();
    gridObjects.forEach((o: any) => o.set("visible", snapEnabled));
    canvas.requestRenderAll();
  }

  function handleDeleteSelected() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && !active.data?.isGrid) {
      canvas.remove(active);
      canvas.discardActiveObject();
      setSelectedInfo(null);
      pushUndo();
      triggerAutoSave();
    }
  }

  function handleRotateSelected() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      active.rotate((active.angle || 0) + 45);
      canvas.requestRenderAll();
      pushUndo();
      triggerAutoSave();
    }
  }

  function handleUpdateLabel(label: string) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && active instanceof Group) {
      const textObj = active.getObjects().find((o) => o instanceof FabricText) as FabricText | undefined;
      if (textObj) textObj.set("text", label);
      active.data = { ...active.data, label };
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
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop side panels */}
        <div className="hidden md:block">
          <FurniturePalette onAddItem={(item) => addFurnitureToCanvas(item)} />
        </div>

        <div
          ref={containerRef}
          className="flex-1 bg-stone-100 overflow-hidden relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <canvas ref={canvasRef} />
          {canvasOverlay}
        </div>

        <div className="hidden md:block">
          <PropertiesPanel
            selected={selectedInfo}
            onUpdateLabel={handleUpdateLabel}
            onUpdateAngle={handleUpdateAngle}
            onDelete={handleDeleteSelected}
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
              mobile
            />
          </div>
        )}
      </div>

      {/* ─── Room Shape Picker Modal ─── */}
      {showRoomPicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm z-50"
            onClick={() => setShowRoomPicker(false)}
          />

          {/* Modal — bottom sheet on mobile, centered card on desktop */}
          <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
            <div className="pointer-events-auto w-full md:w-auto md:min-w-[520px] md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
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

              {/* Shape grid */}
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

                {/* Clear option */}
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
