"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEvent } from "@/hooks/useStore";
import Link from "next/link";
import { ArrowLeft, Users, Lightbulb } from "lucide-react";
import { useState } from "react";

import SeatingPanel from "@/components/floorplan/SeatingPanel";

const FloorPlanEditor = dynamic(
  () => import("@/components/floorplan/FloorPlanEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-stone-100">
        <p className="text-stone-400 text-sm">Loading editor...</p>
      </div>
    ),
  }
);

export default function ClientFloorPlanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const [activePlanId, setActivePlanId] = useState<string>("ceremony");
  const [showSeating, setShowSeating] = useState(false);
  const [showLighting, setShowLighting] = useState(false);

  if (!event) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Event not found.</p>
      </div>
    );
  }

  const plans = event.floorPlans || [];
  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];
  const lightingZones = activePlan?.lightingZones ?? [];
  const hasLighting = lightingZones.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50">
      {/* Top bar */}
      <div className="h-11 md:h-12 bg-white border-b border-stone-200 flex items-center px-4 gap-3 flex-shrink-0">
        <Link
          href={`/client/${eventId}`}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back to Portal</span>
        </Link>
        <div className="w-px h-5 bg-stone-200" />
        <h2 className="text-sm font-medium text-stone-800 truncate hidden sm:block">
          {event.name} — Floor Plan
        </h2>
        <div className="flex-1" />
        {/* Lighting toggle — only show if planner has designed lighting */}
        {hasLighting && (
          <button
            onClick={() => { setShowLighting(!showLighting); if (!showLighting) setShowSeating(false); }}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              showLighting
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "text-stone-400 hover:text-stone-600 hover:bg-stone-50 border border-transparent"
            }`}
          >
            <Lightbulb size={13} />
            <span className="hidden sm:inline">Lighting</span>
          </button>
        )}
        <button
          onClick={() => { setShowSeating(!showSeating); if (!showSeating) setShowLighting(false); }}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            showSeating
              ? "bg-rose-50 text-rose-600 border border-rose-200"
              : "text-stone-400 hover:text-stone-600 hover:bg-stone-50 border border-transparent"
          }`}
        >
          <Users size={13} />
          <span className="hidden sm:inline">Seating</span>
        </button>
        <span className="text-xs text-stone-400 hidden sm:inline">View only</span>
      </div>

      {/* Floor plan tabs */}
      <div className="bg-white border-b border-stone-200 flex items-center px-2 sm:px-4 overflow-x-auto flex-shrink-0">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setActivePlanId(plan.id)}
            className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              plan.id === activePlan?.id
                ? "border-rose-400 text-rose-600"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            {plan.name}
            {(plan.lightingZones ?? []).length > 0 && showLighting && (
              <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">
                {(plan.lightingZones ?? []).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Editor + Seating — lighting rendered natively on canvas (read-only) */}
      <div className="flex-1 relative overflow-hidden">
        {activePlan && (
          <FloorPlanEditor
            key={activePlan.id}
            eventId={eventId}
            initialJSON={activePlan.json}
            onSave={() => {}}
            lightingZones={lightingZones}
            lightingEnabled={showLighting}
            onUpdateZones={() => {}}
            selectedZoneId={null}
            onSelectZone={() => {}}
            readOnly
          />
        )}
        {showSeating && (
          <>
            <div className="absolute inset-0 z-40 md:hidden bg-white overflow-y-auto">
              <div className="sticky top-0 z-10 bg-white border-b border-stone-200 flex items-center justify-between px-4 py-3">
                <h3 className="text-sm font-heading font-semibold text-stone-800">Seating</h3>
                <button
                  onClick={() => setShowSeating(false)}
                  className="text-xs text-stone-400 hover:text-stone-600 font-medium"
                >
                  Done
                </button>
              </div>
              <SeatingPanel
                floorPlanJSON={activePlan?.json ?? null}
                guests={event.guests ?? []}
                onUpdateGuests={() => {}}
              />
            </div>
            <div className="absolute top-0 right-0 bottom-0 z-40 hidden md:block shadow-xl">
              <SeatingPanel
                floorPlanJSON={activePlan?.json ?? null}
                guests={event.guests ?? []}
                onUpdateGuests={() => {}}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
