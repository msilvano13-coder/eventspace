"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, useEventCoreLoaded, useStoreActions, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import Link from "next/link";
import { ArrowLeft, Plus, Users, Lightbulb, ChevronUp, ChevronDown, FileDown, Box } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FloorPlan, Guest, GuestRelationship, LightingZone, createDefaultFloorPlans } from "@/lib/types";
import { v4 as uuid } from "uuid";
import { fetchGuestRelationships } from "@/lib/supabase/db";
import { exportFloorPlanPDF } from "@/lib/floorplan-export-pdf";
import SeatingPanel from "@/components/floorplan/SeatingPanel";
import LightingPanel from "@/components/floorplan/LightingPanel";
import { FloorPlanErrorBoundary } from "@/components/floorplan/FloorPlanErrorBoundary";

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

const FloorPlan3DView = dynamic(
  () => import("@/components/floorplan/FloorPlan3DView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-stone-200">
        <p className="text-stone-400 text-sm">Loading 3D view...</p>
      </div>
    ),
  }
);

export default function FloorPlanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  const coreLoaded = useEventCoreLoaded(eventId);
  useEventSubEntities(eventId, ["guests"]);
  const { updateEvent } = useStoreActions();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showAddTab, setShowAddTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [showSeating, setShowSeating] = useState(false);
  const [showLighting, setShowLighting] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [mobileLightingExpanded, setMobileLightingExpanded] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [guestRelationships, setGuestRelationships] = useState<GuestRelationship[]>([]);
  const getCanvasDataURLRef = useRef<(() => string | null) | null>(null);
  const autoCreatedRef = useRef(false);

  useEffect(() => {
    fetchGuestRelationships(eventId).then(setGuestRelationships).catch(() => {});
  }, [eventId]);

  // Filter out any floor plans with non-UUID IDs (legacy bug) and deduplicate by name
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validPlans = (() => {
    const uuidPlans = (event?.floorPlans || []).filter((fp) => UUID_RE.test(fp.id));
    // Keep only the first plan per name (dedup legacy duplicates, prefer ones with saved JSON)
    const seen = new Map<string, typeof uuidPlans[0]>();
    for (const fp of uuidPlans) {
      const existing = seen.get(fp.name);
      if (!existing || (!existing.json && fp.json)) {
        seen.set(fp.name, fp);
      }
    }
    return Array.from(seen.values());
  })();

  // Resolve the effective active plan ID (fallback to first valid plan)
  const resolvedPlanId = activePlanId ?? validPlans[0]?.id ?? null;

  const handleSave = useCallback(
    (json: string) => {
      if (!event || !resolvedPlanId) {
        console.warn("[FloorPlan] handleSave skipped: event=", !!event, "resolvedPlanId=", resolvedPlanId);
        return;
      }
      const updated = validPlans.map((fp) =>
        fp.id === resolvedPlanId ? { ...fp, json } : fp
      );
      console.log("[FloorPlan] handleSave: saving", updated.length, "plans, active=", resolvedPlanId, "json length=", json.length);
      updateEvent(eventId, { floorPlans: updated });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventId, resolvedPlanId, updateEvent, validPlans]
  );

  // Auto-create default floor plans if none valid exist (wait for core data from DB)
  useEffect(() => {
    if (autoCreatedRef.current || !event || !coreLoaded) return;
    if (validPlans.length === 0) {
      autoCreatedRef.current = true;
      updateEvent(eventId, { floorPlans: createDefaultFloorPlans() });
    }
  }, [event, eventId, updateEvent, validPlans.length, coreLoaded]);

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;

  if (!event) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Event not found.</p>
      </div>
    );
  }

  const plans = validPlans;
  const activePlan = plans.find((p) => p.id === resolvedPlanId) || plans[0];
  const lightingZones = activePlan?.lightingZones ?? [];

  function handleUpdateLightingZones(zones: LightingZone[]) {
    if (!activePlan) return;
    const updatedPlans = plans.map((fp) =>
      fp.id === activePlan.id ? { ...fp, lightingZones: zones } : fp
    );
    updateEvent(eventId, { floorPlans: updatedPlans });
  }

  function handleExportPDF() {
    const dataURL = getCanvasDataURLRef.current?.();
    if (!dataURL || !activePlan || !event) return;
    exportFloorPlanPDF({
      planName: activePlan.name,
      eventName: event.name,
      floorPlanJSON: activePlan.json,
      lightingZones,
      guests: event.guests ?? [],
      canvasDataURL: dataURL,
      canvasWidth: 800,
      canvasHeight: 600,
    });
  }

  function toggleLighting() {
    if (showLighting) {
      setShowLighting(false);
      setSelectedZoneId(null);
    } else {
      setShowLighting(true);
      setShowSeating(false);
    }
  }

  function toggleSeating() {
    if (showSeating) {
      setShowSeating(false);
    } else {
      setShowSeating(true);
      setShowLighting(false);
      setSelectedZoneId(null);
    }
  }

  function addTab() {
    if (!newTabName.trim()) return;
    const newPlan: FloorPlan = { id: uuid(), name: newTabName.trim(), json: null, lightingZones: [] };
    updateEvent(eventId, { floorPlans: [...plans, newPlan] });
    setActivePlanId(newPlan.id);
    setNewTabName("");
    setShowAddTab(false);
  }

  return (
    <FloorPlanErrorBoundary>
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50">
      {/* Top bar */}
      <div className="h-11 md:h-12 bg-white border-b border-stone-200 flex items-center px-4 gap-3 flex-shrink-0">
        <Link
          href={`/planner/${eventId}`}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="w-px h-5 bg-stone-200" />
        <h2 className="text-sm font-medium text-stone-800 truncate hidden sm:block">
          {event.name}
        </h2>
        <div className="flex-1" />

        {/* 3D View toggle */}
        <button
          onClick={() => setShow3D(!show3D)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            show3D
              ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
              : "text-stone-400 hover:text-stone-600 hover:bg-stone-50 border border-transparent"
          }`}
          title={show3D ? "Back to 2D Editor" : "3D Preview"}
        >
          <Box size={13} />
          <span className="hidden sm:inline">{show3D ? "2D" : "3D"}</span>
        </button>

        {/* PDF Export */}
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-50 border border-transparent transition-colors"
          title="Export Floor Plan PDF"
        >
          <FileDown size={13} />
          <span className="hidden sm:inline">PDF</span>
        </button>

        {/* Lighting toggle */}
        <button
          onClick={toggleLighting}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            showLighting
              ? "bg-amber-50 text-amber-600 border border-amber-200"
              : "text-stone-400 hover:text-stone-600 hover:bg-stone-50 border border-transparent"
          }`}
        >
          <Lightbulb size={13} />
          <span>Lighting</span>
        </button>

        {/* Seating toggle */}
        <button
          onClick={toggleSeating}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            showSeating
              ? "bg-rose-50 text-rose-600 border border-rose-200"
              : "text-stone-400 hover:text-stone-600 hover:bg-stone-50 border border-transparent"
          }`}
        >
          <Users size={13} />
          <span className="hidden sm:inline">Seating</span>
        </button>
        <span className="text-xs text-stone-400 hidden sm:inline">Auto-saved</span>
      </div>

      {/* Floor plan tabs */}
      <div className="bg-white border-b border-stone-200 flex items-center px-2 sm:px-4 overflow-x-auto flex-shrink-0">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => { setActivePlanId(plan.id); setSelectedZoneId(null); }}
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
        {showAddTab ? (
          <div className="flex items-center gap-1 px-2">
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTab()}
              placeholder="Plan name..."
              autoFocus
              className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 w-28 outline-none focus:border-rose-400"
            />
            <button onClick={addTab} className="text-rose-500 text-xs font-medium">
              Add
            </button>
            <button
              onClick={() => setShowAddTab(false)}
              className="text-stone-400 text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTab(true)}
            className="px-2 py-2.5 text-stone-300 hover:text-stone-500 transition-colors"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Editor + Side Panels */}
      <div className="flex-1 relative overflow-hidden flex">
        <div className="flex-1 relative">
          {show3D ? (
            activePlan && (
              <FloorPlan3DView
                floorPlanJSON={activePlan.json}
                lightingZones={lightingZones}
                lightingEnabled={showLighting}
              />
            )
          ) : (
            activePlan && (
              <FloorPlanEditor
                key={activePlan.id}
                eventId={eventId}
                initialJSON={activePlan.json}
                onSave={handleSave}
                lightingZones={lightingZones}
                lightingEnabled={showLighting}
                onUpdateZones={handleUpdateLightingZones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
                onCanvasReady={(getDataURL) => { getCanvasDataURLRef.current = getDataURL; }}
              />
            )
          )}
        </div>

        {/* Lighting Panel */}
        {showLighting && (
          <>
            {/* Desktop: absolute side panel */}
            <div className="absolute top-0 right-0 bottom-0 z-40 hidden md:block shadow-xl">
              <LightingPanel
                zones={lightingZones}
                onUpdateZones={handleUpdateLightingZones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
              />
            </div>
            {/* Mobile: collapsible bottom sheet */}
            <div
              className={`absolute left-0 right-0 bottom-0 z-40 md:hidden bg-white rounded-t-2xl shadow-2xl border-t border-stone-200 transition-all duration-300 ${
                mobileLightingExpanded ? "max-h-[45%]" : "max-h-[52px]"
              } overflow-hidden`}
            >
              <div
                className="sticky top-0 z-10 bg-white border-b border-stone-100 flex items-center justify-between px-4 py-3 rounded-t-2xl cursor-pointer"
                onClick={() => setMobileLightingExpanded(!mobileLightingExpanded)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-1 bg-stone-300 rounded-full absolute left-1/2 -translate-x-1/2 top-1.5" />
                  <Lightbulb size={14} className="text-amber-400" />
                  <h3 className="text-sm font-heading font-semibold text-stone-800">Lighting</h3>
                  <span className="text-[11px] text-stone-400 font-medium">{lightingZones.length} zone{lightingZones.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMobileLightingExpanded(!mobileLightingExpanded); }}
                    className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg"
                  >
                    {mobileLightingExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowLighting(false); setSelectedZoneId(null); }}
                    className="text-xs text-stone-400 hover:text-stone-600 font-medium px-2 py-1"
                  >
                    Done
                  </button>
                </div>
              </div>
              <div className={`overflow-y-auto ${mobileLightingExpanded ? "max-h-[calc(45vh-52px)]" : "max-h-0"}`}>
                <LightingPanel
                  zones={lightingZones}
                  onUpdateZones={handleUpdateLightingZones}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={setSelectedZoneId}
                />
              </div>
            </div>
          </>
        )}

        {/* Seating panels */}
        {showSeating && (
          <>
            {/* Mobile: full-screen overlay */}
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
                onUpdateGuests={(guests: Guest[]) => updateEvent(eventId, { guests })}
                relationships={guestRelationships}
              />
            </div>
            {/* Desktop: side panel */}
            <div className="absolute top-0 right-0 bottom-0 z-40 hidden md:block shadow-xl">
              <SeatingPanel
                floorPlanJSON={activePlan?.json ?? null}
                guests={event.guests ?? []}
                onUpdateGuests={(guests: Guest[]) => updateEvent(eventId, { guests })}
                relationships={guestRelationships}
              />
            </div>
          </>
        )}
      </div>
    </div>
    </FloorPlanErrorBoundary>
  );
}
