"use client";

import React from "react";
import { VenuePreset, VENUE_PRESETS } from "../VenueEnvironment";
import {
  LINEN_COLORS,
  FLOOR_MATERIALS,
  type View3DSettings,
} from "./constants";

export function Settings3DPanel({
  settings,
  onChange,
  open,
  onToggle,
}: {
  settings: View3DSettings;
  onChange: (s: View3DSettings) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const update = <K extends keyof View3DSettings>(key: K, value: View3DSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const selectPreset = (preset: VenuePreset) => {
    const def = VENUE_PRESETS[preset];
    if (def) {
      onChange({
        ...settings,
        venuePreset: preset,
        floorMaterial: def.floorMaterial,
        lightingMood: def.lightingMood,
      });
    } else {
      onChange({ ...settings, venuePreset: preset });
    }
  };

  return (
    <div className="absolute top-3 right-3 z-10">
      {/* Gear toggle button */}
      <button
        onClick={onToggle}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
          open
            ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
            : "bg-white/90 text-stone-500 hover:text-stone-700 border border-stone-200 shadow-sm"
        }`}
        title="3D View Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>

      {/* Settings panel */}
      {open && (
        <div className="absolute top-11 right-0 w-64 max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-stone-200 p-4 space-y-4">
          <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">3D Settings</h3>

          {/* Venue Preset */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Venue</label>
            <div className="flex flex-wrap gap-1.5">
              {(["none", "indoor-ballroom", "tent", "outdoor-garden", "rooftop", "barn", "beach"] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => selectPreset(preset)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.venuePreset === preset
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {preset === "none" ? "Default" : (VENUE_PRESETS[preset]?.label ?? preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Chair Style */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Chair Style</label>
            <div className="flex flex-wrap gap-1.5">
              {(["solid-back", "chiavari", "folding", "ghost"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => update("chairStyle", style)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.chairStyle === style
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {style.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-stone-400">Color</label>
              <input
                type="color"
                value={settings.chairColor ?? "#c4a46c"}
                onChange={(e) => update("chairColor", e.target.value)}
                className="w-7 h-7 rounded border border-stone-200 cursor-pointer p-0"
              />
              {settings.chairColor && (
                <button
                  onClick={() => update("chairColor", null)}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  Reset
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.matchSeatToLinen}
                onChange={(e) => update("matchSeatToLinen", e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 rounded"
              />
              <span className="text-xs text-stone-400">Match seat cushion to linen</span>
            </label>
          </div>

          {/* Linen Color */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Linen Color</label>
            <div className="flex flex-wrap gap-1.5">
              {(["ivory", "white", "blush", "navy", "sage", "gold"] as const).map((color) => (
                <button
                  key={color}
                  onClick={() => onChange({ ...settings, linenColor: color, linenCustomColor: null })}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
                    settings.linenColor === color
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-stone-300" style={{ backgroundColor: LINEN_COLORS[color] }} />
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-stone-400">Custom</label>
              <input
                type="color"
                value={settings.linenCustomColor ?? LINEN_COLORS[settings.linenColor]}
                onChange={(e) => update("linenCustomColor", e.target.value)}
                className="w-7 h-7 rounded border border-stone-200 cursor-pointer p-0"
              />
              {settings.linenCustomColor && (
                <button
                  onClick={() => update("linenCustomColor", null)}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Floor Material */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Floor</label>
            <div className="flex flex-wrap gap-1.5">
              {(["hardwood", "marble", "carpet", "concrete"] as const).map((mat) => (
                <button
                  key={mat}
                  onClick={() => onChange({ ...settings, floorMaterial: mat, floorColor: null })}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.floorMaterial === mat
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {mat.charAt(0).toUpperCase() + mat.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-stone-400">Color</label>
              <input
                type="color"
                value={settings.floorColor ?? FLOOR_MATERIALS[settings.floorMaterial].color}
                onChange={(e) => update("floorColor", e.target.value)}
                className="w-7 h-7 rounded border border-stone-200 cursor-pointer p-0"
              />
              {settings.floorColor && (
                <button
                  onClick={() => update("floorColor", null)}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Wall Color */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Wall Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.wallColor ?? "#f5f0e8"}
                onChange={(e) => update("wallColor", e.target.value)}
                className="w-7 h-7 rounded border border-stone-200 cursor-pointer p-0"
              />
              <span className="text-xs text-stone-400">{settings.wallColor ? "Custom" : "Default"}</span>
              {settings.wallColor && (
                <button
                  onClick={() => update("wallColor", null)}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Lighting Mood */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Lighting</label>
            <div className="flex flex-wrap gap-1.5">
              {(["warm", "cool", "neutral", "dramatic"] as const).map((mood) => (
                <button
                  key={mood}
                  onClick={() => update("lightingMood", mood)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.lightingMood === mood
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-stone-400 whitespace-nowrap">Color Cast</label>
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.05}
                value={settings.lightingColorCast}
                onChange={(e) => update("lightingColorCast", parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-indigo-500"
              />
              <span className="text-xs text-stone-400 w-10 text-right">{Math.round(settings.lightingColorCast * 100)}%</span>
            </div>
          </div>

          {/* Camera Preset */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Camera</label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: "default", label: "Default" },
                { key: "birds-eye", label: "Bird's Eye" },
                { key: "eye-level", label: "Eye Level" },
                { key: "presentation", label: "Presentation" },
                { key: "walkthrough", label: "Walk Through" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => update("cameraPreset", key)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.cameraPreset === key
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Quality</label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: "auto", label: "Auto" },
                { key: "low", label: "Low" },
                { key: "medium", label: "Medium" },
                { key: "high", label: "High" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => update("qualityOverride", key)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    settings.qualityOverride === key
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-1">Higher quality uses more GPU. Auto detects your device.</p>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-100">
            <span className="text-xs text-stone-500">Labels</span>
            <button
              onClick={() => update("showLabels", !settings.showLabels)}
              className={`w-8 h-[18px] rounded-full transition-colors relative ${
                settings.showLabels ? "bg-indigo-500" : "bg-stone-300"
              }`}
            >
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                settings.showLabels ? "left-4" : "left-0.5"
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500">Shadows</span>
            <button
              onClick={() => update("showShadows", !settings.showShadows)}
              className={`w-8 h-[18px] rounded-full transition-colors relative ${
                settings.showShadows ? "bg-indigo-500" : "bg-stone-300"
              }`}
            >
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                settings.showShadows ? "left-4" : "left-0.5"
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
