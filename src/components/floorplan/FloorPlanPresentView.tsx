"use client";

import { useEffect, useRef } from "react";
import {
  Canvas,
  FabricObject,
  FabricText,
  classRegistry,
} from "fabric";
import { unwrapCanvasJSON } from "@/lib/floorplan-schema";
import type { LightingZone } from "@/lib/types";

// Ensure custom 'data' property is deserialized
const origToObject = FabricObject.prototype.toObject;
FabricObject.prototype.toObject = function (propertiesToInclude?: string[]) {
  return origToObject.call(this, [...(propertiesToInclude || []), "data"]);
};
classRegistry.setClass(FabricText, "FabricText");

interface Props {
  floorPlanJSON: string | null;
  lightingZones?: LightingZone[];
  lightingEnabled?: boolean;
  presentationMode?: boolean;
}

export default function FloorPlanPresentView({
  floorPlanJSON,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = document.createElement("canvas");
    containerRef.current.appendChild(el);
    const canvas = new Canvas(el, {
      selection: false,
      renderOnAddRemove: true,
    });
    canvasRef.current = canvas;

    // Fit to container
    const rect = containerRef.current.getBoundingClientRect();
    canvas.setDimensions({ width: rect.width, height: rect.height });

    // Load JSON
    if (floorPlanJSON) {
      const json = unwrapCanvasJSON(floorPlanJSON);
      canvas.loadFromJSON(json).then(() => {
        // Make all objects non-interactive
        canvas.getObjects().forEach((obj) => {
          obj.set({
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
          });
        });
        // Zoom-to-fit
        const group = canvas.getObjects();
        if (group.length > 0) {
          const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
          group.forEach((o) => {
            const br = o.getBoundingRect();
            bounds.left = Math.min(bounds.left, br.left);
            bounds.top = Math.min(bounds.top, br.top);
            bounds.right = Math.max(bounds.right, br.left + br.width);
            bounds.bottom = Math.max(bounds.bottom, br.top + br.height);
          });
          const objW = bounds.right - bounds.left;
          const objH = bounds.bottom - bounds.top;
          const padding = 40;
          const scale = Math.min(
            (rect.width - padding * 2) / objW,
            (rect.height - padding * 2) / objH,
            1.5
          );
          const vpCenterX = rect.width / 2;
          const vpCenterY = rect.height / 2;
          const objCenterX = (bounds.left + bounds.right) / 2;
          const objCenterY = (bounds.top + bounds.bottom) / 2;
          canvas.setViewportTransform([
            scale, 0, 0, scale,
            vpCenterX - objCenterX * scale,
            vpCenterY - objCenterY * scale,
          ]);
        }
        canvas.requestRenderAll();
      });
    }

    // Handle resize
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.setDimensions({ width, height });
        canvas.requestRenderAll();
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [floorPlanJSON]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-stone-900"
      style={{ minHeight: 200 }}
    />
  );
}
