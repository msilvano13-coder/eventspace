"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { LightingZone, LightingType } from "@/lib/types";

interface Props {
  zones: LightingZone[];
  onUpdateZones: (zones: LightingZone[]) => void;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
  enabled: boolean;
}

const TYPE_DEFAULTS: Record<LightingType, { name: string; color: string; size: number; intensity: number }> = {
  uplight:   { name: "Uplight",      color: "#c084fc", size: 50,  intensity: 80 },
  spotlight: { name: "Spotlight",    color: "#fbbf24", size: 60,  intensity: 70 },
  pinspot:   { name: "Pin Spot",     color: "#f5f5f4", size: 30,  intensity: 60 },
  gobo:      { name: "Gobo",         color: "#fb7185", size: 45,  intensity: 50 },
  wash:      { name: "Wash Light",   color: "#60a5fa", size: 80,  intensity: 65 },
  string:    { name: "String Light", color: "#fde68a", size: 40,  intensity: 75 },
  candles:   { name: "Candles",      color: "#f59e0b", size: 20,  intensity: 40 },
};

export default function LightingOverlay({ zones, onUpdateZones, selectedZoneId, onSelectZone, enabled }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const zonesRef = useRef(zones);
  const onUpdateZonesRef = useRef(onUpdateZones);

  useEffect(() => {
    zonesRef.current = zones;
    onUpdateZonesRef.current = onUpdateZones;
  });

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

  // Global mouse move/up to support dragging beyond zone bounds
  useEffect(() => {
    if (!dragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - dragOffset.current.x) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - dragOffset.current.y) / rect.height) * 100));
      onUpdateZonesRef.current(zonesRef.current.map((z) => z.id === dragging ? { ...z, x, y } : z));
    };

    const handleGlobalMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [dragging]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, zoneId: string) => {
    if (!enabled) return;
    e.stopPropagation();
    e.preventDefault();
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

  // Global touch move/end for zone dragging
  useEffect(() => {
    if (!dragging) return;

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!overlayRef.current) return;
      e.preventDefault();
      const rect = overlayRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = Math.max(0, Math.min(100, ((touch.clientX - dragOffset.current.x) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((touch.clientY - dragOffset.current.y) / rect.height) * 100));
      onUpdateZonesRef.current(zonesRef.current.map((z) => z.id === dragging ? { ...z, x, y } : z));
    };

    const handleGlobalTouchEnd = () => {
      setDragging(null);
    };

    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
    window.addEventListener("touchend", handleGlobalTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("touchend", handleGlobalTouchEnd);
    };
  }, [dragging]);

  // Scroll-wheel resize: when hovering a zone, scroll up/down to resize
  useEffect(() => {
    const el = overlayRef.current;
    if (!el || !enabled) return;

    const handleWheel = (e: WheelEvent) => {
      if (!selectedZoneId) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -2 : 2;
      const zone = zonesRef.current.find((z) => z.id === selectedZoneId);
      if (!zone) return;
      const newSize = Math.max(10, Math.min(200, zone.size + delta));
      onUpdateZonesRef.current(zonesRef.current.map((z) => z.id === selectedZoneId ? { ...z, size: newSize } : z));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [enabled, selectedZoneId]);

  if (!enabled) return null;

  // The overlay is pointer-events: none so the Fabric.js canvas underneath
  // remains fully interactive (pan, zoom, select). Only individual zone
  // elements have pointer-events: auto so they can be dragged.
  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      style={{
        background: "rgba(10, 10, 30, 0.45)",
        pointerEvents: "none",
        zIndex: 35,
      }}
    >
      {zones.map((zone) => {
        const isSelected = zone.id === selectedZoneId;
        // Size is now in pixels (10–200px), with minimum 44px touch target on mobile
        const visualSize = zone.size;
        const touchSize = Math.max(44, zone.size);
        const glowBlur = Math.max(4, zone.size * 0.3);
        const opacity = zone.intensity / 100;
        // Dynamic label size based on zone size
        const labelSize = zone.size < 30 ? 7 : zone.size < 50 ? 8 : 9;
        const showLabel = zone.size >= 20;

        return (
          <div
            key={zone.id}
            className="absolute"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              transform: `translate(-50%, -50%) rotate(${zone.angle ?? 0}deg)`,
              width: `${touchSize}px`,
              height: `${touchSize}px`,
              cursor: enabled ? (dragging === zone.id ? "grabbing" : "grab") : "default",
              zIndex: isSelected ? 30 : 20,
              pointerEvents: "auto",
            }}
            onMouseDown={(e) => handleMouseDown(e, zone.id)}
            onTouchStart={(e) => handleTouchStart(e, zone.id)}
          >
            {/* Glow effect */}
            <div
              className="absolute rounded-full"
              style={{
                inset: `${((touchSize - visualSize) / 2) - (visualSize)}px`,
                background: `radial-gradient(circle, ${zone.color}${Math.round(opacity * 80).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
                filter: `blur(${glowBlur}px)`,
                pointerEvents: "none",
              }}
            />
            {/* Core circle — centered within the touch target */}
            <div
              className="absolute rounded-full flex items-center justify-center transition-all"
              style={{
                left: `${(touchSize - visualSize * 0.8) / 2}px`,
                top: `${(touchSize - visualSize * 0.8) / 2}px`,
                width: `${visualSize * 0.8}px`,
                height: `${visualSize * 0.8}px`,
                border: `${zone.size < 30 ? 1.5 : 2}px solid ${isSelected ? "#fb7185" : "rgba(255,255,255,0.35)"}`,
                background: `${zone.color}20`,
                boxShadow: isSelected ? "0 0 0 3px rgba(251,113,133,0.3)" : "none",
              }}
            >
              {showLabel && (
                <span
                  className="text-white/90 font-semibold text-center leading-tight select-none pointer-events-none"
                  style={{ fontSize: `${labelSize}px` }}
                >
                  {zone.name.length > (zone.size < 50 ? 6 : 12)
                    ? zone.name.slice(0, zone.size < 50 ? 4 : 10) + "…"
                    : zone.name}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { TYPE_DEFAULTS };
