"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

export interface SelectedObjectInfo {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  furnitureId: string;
}

interface Props {
  selected: SelectedObjectInfo | null;
  onUpdateLabel: (label: string) => void;
  onUpdateAngle: (angle: number) => void;
  onDelete: () => void;
  mobile?: boolean;
}

export default function PropertiesPanel({
  selected,
  onUpdateLabel,
  onUpdateAngle,
  onDelete,
  mobile,
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

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
            X
          </label>
          <input
            type="number"
            value={Math.round(selected.x)}
            readOnly
            className="w-full border border-stone-200 bg-stone-50 rounded-xl px-3 py-2 text-xs text-stone-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
            Y
          </label>
          <input
            type="number"
            value={Math.round(selected.y)}
            readOnly
            className="w-full border border-stone-200 bg-stone-50 rounded-xl px-3 py-2 text-xs text-stone-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5">
          Rotation
        </label>
        <input
          type="range"
          min={0}
          max={360}
          value={selected.angle}
          onChange={(e) => onUpdateAngle(Number(e.target.value))}
          className="w-full accent-rose-400"
        />
        <p className="text-[10px] text-stone-400 text-right mt-0.5">
          {Math.round(selected.angle)}°
        </p>
      </div>

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
