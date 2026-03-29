"use client";

import { LightingZone, LightingType } from "@/lib/types";
import { Trash2, Lightbulb } from "lucide-react";
import { LIGHTING_TYPE_DEFAULTS as TYPE_DEFAULTS } from "@/lib/constants";

interface Props {
  zones: LightingZone[];
  onUpdateZones: (zones: LightingZone[]) => void;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
}

const LIGHTING_TYPES: { value: LightingType; label: string }[] = [
  { value: "uplight", label: "LED Uplight" },
  { value: "spotlight", label: "Spotlight" },
  { value: "pinspot", label: "Pin Spot" },
  { value: "gobo", label: "Gobo Projector" },
  { value: "wash", label: "Wash Light" },
  { value: "string", label: "String Light" },
  { value: "candles", label: "Candles" },
];

const COLOR_PRESETS = [
  "#c084fc", "#fb7185", "#60a5fa", "#fbbf24", "#4ade80", "#f5f5f4", "#f59e0b", "#e879f9",
];

const AMBIANCE_PRESETS = [
  {
    name: "Romantic Gold",
    zones: [
      { type: "uplight" as LightingType, color: "#fbbf24", intensity: 80 },
      { type: "spotlight" as LightingType, color: "#f59e0b", intensity: 60 },
      { type: "candles" as LightingType, color: "#fde68a", intensity: 50 },
    ],
  },
  {
    name: "Enchanted",
    zones: [
      { type: "uplight" as LightingType, color: "#c084fc", intensity: 85 },
      { type: "string" as LightingType, color: "#e879f9", intensity: 70 },
      { type: "wash" as LightingType, color: "#a78bfa", intensity: 55 },
    ],
  },
  {
    name: "Blush Garden",
    zones: [
      { type: "uplight" as LightingType, color: "#fb7185", intensity: 75 },
      { type: "pinspot" as LightingType, color: "#fda4af", intensity: 60 },
      { type: "candles" as LightingType, color: "#fecdd3", intensity: 45 },
    ],
  },
  {
    name: "Classic White",
    zones: [
      { type: "spotlight" as LightingType, color: "#f5f5f4", intensity: 80 },
      { type: "pinspot" as LightingType, color: "#fde68a", intensity: 55 },
      { type: "string" as LightingType, color: "#f5f5f4", intensity: 65 },
    ],
  },
];

export default function LightingPanel({ zones, onUpdateZones, selectedZoneId, onSelectZone }: Props) {
  const selectedZone = selectedZoneId ? zones.find((z) => z.id === selectedZoneId) : null;

  function addZone(type: LightingType) {
    const defaults = TYPE_DEFAULTS[type];
    const newZone: LightingZone = {
      id: crypto.randomUUID(),
      name: defaults.name,
      type,
      color: defaults.color,
      intensity: defaults.intensity,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      size: defaults.size,
      notes: "",
    };
    onUpdateZones([...zones, newZone]);
    onSelectZone(newZone.id);
  }

  function updateZone(id: string, updates: Partial<LightingZone>) {
    onUpdateZones(zones.map((z) => z.id === id ? { ...z, ...updates } : z));
  }

  function deleteZone(id: string) {
    onUpdateZones(zones.filter((z) => z.id !== id));
    if (selectedZoneId === id) onSelectZone(null);
  }

  function applyPreset(preset: typeof AMBIANCE_PRESETS[0]) {
    const newZones: LightingZone[] = preset.zones.map((z, i) => {
      const defaults = TYPE_DEFAULTS[z.type];
      return {
        id: crypto.randomUUID(),
        name: defaults.name,
        type: z.type,
        color: z.color,
        intensity: z.intensity,
        x: 25 + (i * 25),
        y: 40 + (i % 2 === 0 ? 0 : 20),
        size: defaults.size,
        notes: "",
      };
    });
    onUpdateZones(newZones);
    onSelectZone(null);
  }

  return (
    <div className="w-72 md:w-72 bg-white border-l border-stone-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-stone-100">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={14} className="text-amber-400" />
          <h3 className="text-sm font-heading font-semibold text-stone-800">Lighting Design</h3>
        </div>

        {/* Quick add buttons — larger tap targets on mobile */}
        <p className="text-[11px] uppercase tracking-widest text-stone-400 font-medium mb-2">Add Light</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {LIGHTING_TYPES.map((lt) => (
            <button
              key={lt.value}
              onClick={() => addZone(lt.value)}
              className="text-xs font-medium text-stone-600 bg-stone-50 hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 rounded-xl px-3 py-2.5 text-left transition-colors flex items-center gap-2 min-h-[44px]"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ background: TYPE_DEFAULTS[lt.value].color }}
              />
              {lt.label}
            </button>
          ))}
        </div>

        {/* Ambiance presets */}
        <p className="text-[11px] uppercase tracking-widest text-stone-400 font-medium mb-2">Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {AMBIANCE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="text-left bg-stone-50 hover:bg-rose-50 active:bg-rose-100 rounded-xl p-3 transition-colors min-h-[44px]"
            >
              <div className="flex gap-1.5 mb-1.5">
                {preset.zones.map((z, i) => (
                  <div key={i} className="w-4 h-4 rounded-full" style={{ background: z.color }} />
                ))}
              </div>
              <span className="text-xs font-medium text-stone-600">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Zone list */}
      <div className="p-4">
        <p className="text-[11px] uppercase tracking-widest text-stone-400 font-medium mb-2">
          Zones ({zones.length})
        </p>

        {zones.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No lighting zones yet. Add one above or use a preset.</p>
        ) : (
          <div className="space-y-1.5">
            {zones.map((zone) => (
              <div
                key={zone.id}
                onClick={() => onSelectZone(zone.id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all min-h-[48px] ${
                  zone.id === selectedZoneId
                    ? "bg-rose-50 border border-rose-200"
                    : "hover:bg-stone-50 active:bg-stone-100 border border-transparent"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${zone.color}, ${zone.color}bb)` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-700 truncate">{zone.name}</p>
                  <p className="text-[11px] text-stone-400">
                    {LIGHTING_TYPES.find((lt) => lt.value === zone.type)?.label}
                  </p>
                </div>
                <span className="text-xs font-semibold text-stone-500">{zone.intensity}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected zone edit */}
      {selectedZone && (
        <div className="p-4 border-t border-stone-100">
          <h4 className="text-sm font-semibold text-stone-800 mb-3">
            Edit: {selectedZone.name}
          </h4>

          {/* Name */}
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-1">Name</label>
            <input
              value={selectedZone.name}
              onChange={(e) => updateZone(selectedZone.id, { name: e.target.value })}
              className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:border-rose-300 bg-white min-h-[44px]"
            />
          </div>

          {/* Type */}
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-1">Type</label>
            <select
              value={selectedZone.type}
              onChange={(e) => updateZone(selectedZone.id, { type: e.target.value as LightingType })}
              className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:border-rose-300 bg-white min-h-[44px]"
            >
              {LIGHTING_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>{lt.label}</option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateZone(selectedZone.id, { color: c })}
                  className="w-9 h-9 rounded-xl transition-all"
                  style={{
                    background: c,
                    border: selectedZone.color === c ? "2.5px solid #1c1917" : "2px solid transparent",
                    transform: selectedZone.color === c ? "scale(1.1)" : "scale(1)",
                  }}
                />
              ))}
              <input
                type="color"
                value={selectedZone.color}
                onChange={(e) => updateZone(selectedZone.id, { color: e.target.value })}
                className="w-9 h-9 rounded-xl border border-stone-200 cursor-pointer"
                style={{ padding: 0 }}
              />
            </div>
          </div>

          {/* Intensity */}
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-1">
              Intensity — {selectedZone.intensity}%
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={selectedZone.intensity}
              onChange={(e) => updateZone(selectedZone.id, { intensity: parseInt(e.target.value) })}
              className="w-full accent-rose-400 h-2"
            />
          </div>

          {/* Size */}
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-1">
              Size — {selectedZone.size}px
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="1"
              value={selectedZone.size}
              onChange={(e) => updateZone(selectedZone.id, { size: parseInt(e.target.value) })}
              className="w-full accent-rose-400 h-2"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-1">Notes</label>
            <input
              value={selectedZone.notes}
              onChange={(e) => updateZone(selectedZone.id, { notes: e.target.value })}
              placeholder="Mount at 6ft, color wash…"
              className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:border-rose-300 bg-white min-h-[44px]"
            />
          </div>

          {/* Delete */}
          <button
            onClick={() => deleteZone(selectedZone.id)}
            className="flex items-center gap-2 text-sm text-stone-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 px-3 py-2.5 rounded-xl transition-colors w-full min-h-[44px]"
          >
            <Trash2 size={14} />
            Remove zone
          </button>
        </div>
      )}
    </div>
  );
}
