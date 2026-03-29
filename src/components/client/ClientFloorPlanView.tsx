"use client";

import { useEffect, useRef } from "react";
import { StaticCanvas } from "fabric";
import { unwrapCanvasJSON } from "@/lib/floorplan-schema";

interface Props {
  floorPlanJSON: string;
}

export default function ClientFloorPlanView({ floorPlanJSON }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const canvas = new StaticCanvas(canvasRef.current, {
      width: w,
      height: h,
      backgroundColor: "#ffffff",
    });

    // Unwrap handles both legacy (raw Fabric JSON) and versioned envelopes
    const canvasJSON = unwrapCanvasJSON(floorPlanJSON);
    canvas.loadFromJSON(canvasJSON).then(() => {
      canvas.requestRenderAll();
    });

    return () => {
      canvas.dispose();
    };
  }, [floorPlanJSON]);

  return (
    <div ref={containerRef} className="w-full h-full bg-stone-100">
      <canvas ref={canvasRef} />
    </div>
  );
}
