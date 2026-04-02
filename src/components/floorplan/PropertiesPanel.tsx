"use client";

import { useState, useEffect } from "react";
import { Trash2, UtensilsCrossed } from "lucide-react";
import { pxToFeetInches } from "@/lib/constants";
import { getFurnitureById } from "./furniture-items";
import type { RotationSnapValue } from "./Toolbar";
import type { Tablescape } from "@/lib/types";

export interface SelectedObjectInfo {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  furnitureId: string;
  tablescapeId?: string;
}

interface Props {
  selected: SelectedObjectInfo | null;
  onUpdateLabel: (label: string) => void;
  onUpdateAngle: (angle: number) => void;
  onDelete: () => void;
  mobile?: boolean;
  rotationSnap?: RotationSnapValue;
  tablescapes?: Tablescape[];
  onAssignTablescape?: (tablescapeId: string | null) => void;
}

export default function PropertiesPanel({
  selected,
  onUpdateLabel,
  onUpdateAngle,
  onDelete,
  mobile,
  rotationSnap = false as RotationSnapValue,
  tablescapes,
  onAssignTablescape,
}: Props) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (selected) setLabel(selected.label);
  }, [selected]);

  if (!selected) {
    if (mobile) return null;
    return (
      <div className="w-56 bg-white border-l border-stone-200 flex-shrink-0 p-4">
        <p className="text-xs text-stone-400 text-center mt-8">
          Select an item to view its properties
        </p>
      </div>
    );
  }

  const content = (
    <div className={mobile ? "p-4 space-y-4" : "space-y-4"}>
      <div>
        <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5">
          Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => onUpdateLabel(label)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onUpdateLabel(label);
          }}
          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none transition-colors"
        />
      </div>

      <div>
        <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
          Dimensions
        </label>
        <p className="text-xs text-stone-600 bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
          {(() => {
            const furnitureDef = getFurnitureById(selected.furnitureId);
            if (furnitureDef?.shape === "circle") {
              return `\u00D8 ${pxToFeetInches(selected.width)}`;
            }
            return `${pxToFeetInches(selected.width)} \u00D7 ${pxToFeetInches(selected.height)}`;
          })()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
            X
          </label>
          <p className="text-xs text-stone-500 bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
            {pxToFeetInches(selected.x)}
          </p>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
            Y
          </label>
          <p className="text-xs text-stone-500 bg-stone-50 rounded-xl px-3 py-2 border border-stone-200">
            {pxToFeetInches(selected.y)}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5">
          Rotation{rotationSnap ? ` (${rotationSnap}° snap)` : ""}
        </label>
        <input
          type="range"
          min={0}
          max={360}
          step={rotationSnap ? rotationSnap : 1}
          value={rotationSnap ? Math.round(selected.angle / rotationSnap) * rotationSnap : selected.angle}
          onChange={(e) => onUpdateAngle(Number(e.target.value))}
          className="w-full accent-rose-400"
        />
        <p className="text-[10px] text-stone-400 text-right mt-0.5">
          {Math.round(selected.angle)}°
        </p>
      </div>

      {/* Tablescape assignment — only for tables */}
      {tablescapes && onAssignTablescape && /^(round-table|rect-table|sweetheart)/.test(selected.furnitureId) && (
        <div>
          <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1">
              <UtensilsCrossed size={10} />
              Tablescape
            </span>
          </label>
          <select
            value={selected.tablescapeId || ""}
            onChange={(e) => onAssignTablescape(e.target.value || null)}
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 outline-none transition-colors bg-white"
          >
            <option value="">None</option>
            {tablescapes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.items.length} items)
              </option>
            ))}
          </select>
          {selected.tablescapeId && (
            <p className="text-[9px] text-teal-500 mt-1">
              Will render in 3D preview
            </p>
          )}
        </div>
      )}

      <button
        onClick={onDelete}
        className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 rounded-xl px-3 py-2.5 text-xs hover:bg-red-50 transition-colors"
      >
        <Trash2 size={12} />
        Delete Item
      </button>
    </div>
  );

  if (mobile) return content;

  return (
    <div className="w-56 bg-white border-l border-stone-200 flex-shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-stone-100">
        <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
          Properties
        </h3>
      </div>
      <div className="p-3">{content}</div>
    </div>
  );
}
