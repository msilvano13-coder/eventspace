"use client";

import { useState, useRef, useCallback } from "react";
import { LightingZone, LightingType } from "@/lib/types";

interface Props {
  zones: LightingZone[];
  onUpdateZones: (zones: LightingZone[]) => void;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
  enabled: boolean;
}

const TYPE_DEFAULTS: Record<LightingType, { name: string; color: string; size: number; intensity: number }> = {
  uplight:   { name: "Uplight",     color: "#c084fc", size: 8,  intensity: 80 },
  spotlight: { name: "Spotlight",   color: "#fbbf24", size: 10, intensity: 70 },
  pinspot:   { name: "Pin Spot",    color: "#f5f5f4", size: 5,  intensity: 60 },
  gobo:      { name: "Gobo",        color: "#fb7185", size: 7,  intensity: 50 },
  wash:      { name: "Wash Light",  color: "#60a5fa", size: 12, intensity: 65 },
  string:    { name: "String Light", color: "#fde68a", size: 6,  intensity: 75 },
  candles:   { name: "Candles",     color: "#f59e0b", size: 4,  intensity: 40 },
};

export default function LightingOverlay({ zones, onUpdateZones, selectedZoneId, onSelectZone, enabled }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;
    // Only deselect if clicking the overlay itself, not a zone
    if (e.target === overlayRef.current) {
      onSelectZone(null);
    }
  }, [enabled, onSelectZone]);

  const handleMouseDown = useCallback((e: React.MouseEvent, zoneId: string) => {
    if (!enabled) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectZone(zoneId);
    setDragging(zoneId);

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    const zonePixelX = (zone.x / 100) * rect.width;
    const zonePixelY = (zone.y / 100) * rect.height;
    dragOffset.current = { x: e.clientX - zonePixelX, y: e.clientY - zonePixelY };
  }, [enabled, zones, onSelectZone]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - dragOffset.current.x) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - dragOffset.current.y) / rect.height) * 100));

    onUpdateZones(zones.map((z) => z.id === dragging ? { ...z, x, y } : z));
  }, [dragging, zones, onUpdateZones]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, zoneId: string) => {
    if (!enabled) return;
    e.stopPropagation();
    onSelectZone(zoneId);
    setDragging(zoneId);

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    const touch = e.touches[0];

    const zonePixelX = (zone.x / 100) * rect.width;
    const zonePixelY = (zone.y / 100) * rect.height;
    dragOffset.current = { x: touch.clientX - zonePixelX, y: touch.clientY - zonePixelY };
  }, [enabled, zones, onSelectZone]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || !overlayRef.current) return;
    e.preventDefault();
    const rect = overlayRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(100, ((touch.clientX - dragOffset.current.x) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - dragOffset.current.y) / rect.height) * 100));

    onUpdateZones(zones.map((z) => z.id === dragging ? { ...z, x, y } : z));
  }, [dragging, zones, onUpdateZones]);

  if (!enabled) return null;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      style={{ background: "rgba(10, 10, 30, 0.55)", cursor: dragging ? "grabbing" : "default", zIndex: 35 }}
      onClick={handleOverlayClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      {zones.map((zone) => {
        const isSelected = zone.id === selectedZoneId;
        const sizePx = `${zone.size * 2}%`;
        const opacity = zone.intensity / 100;

        return (
          <div
            key={zone.id}
            className="absolute"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              transform: "translate(-50%, -50%)",
              width: sizePx,
              height: sizePx,
              cursor: enabled ? "grab" : "default",
              zIndex: isSelected ? 30 : 20,
            }}
            onMouseDown={(e) => handleMouseDown(e, zone.id)}
            onTouchStart={(e) => handleTouchStart(e, zone.id)}
          >
            {/* Glow effect */}
            <div
              className="absolute rounded-full"
              style={{
                inset: "-100%",
                background: `radial-gradient(circle, ${zone.color}${Math.round(opacity * 80).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
                filter: "blur(8px)",
                pointerEvents: "none",
              }}
            />
            {/* Core circle */}
            <div
              className="absolute inset-[15%] rounded-full flex items-center justify-center transition-all"
              style={{
                border: `2px solid ${isSelected ? "#fb7185" : "rgba(255,255,255,0.35)"}`,
                background: `${zone.color}20`,
                boxShadow: isSelected ? "0 0 0 3px rgba(251,113,133,0.3)" : "none",
              }}
            >
              <span className="text-[8px] sm:text-[9px] text-white/90 font-semibold text-center leading-tight select-none pointer-events-none">
                {zone.name.length > 12 ? zone.name.slice(0, 10) + "…" : zone.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { TYPE_DEFAULTS };
