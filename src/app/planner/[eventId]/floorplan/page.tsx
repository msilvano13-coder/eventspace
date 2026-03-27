"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEvent, useStoreActions } from "@/hooks/useStore";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { FloorPlan } from "@/lib/types";
import { v4 as uuid } from "uuid";

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

export default function FloorPlanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const { updateEvent } = useStoreActions();
  const [activePlanId, setActivePlanId] = useState<string>("ceremony");
  const [showAddTab, setShowAddTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");

  const handleSave = useCallback(
    (json: string) => {
      if (!event) return;
      const updated = event.floorPlans.map((fp) =>
        fp.id === activePlanId ? { ...fp, json } : fp
      );
      updateEvent(eventId, { floorPlans: updated });
    },
    [eventId, activePlanId, updateEvent, event]
  );

  if (!event) {
    return (
      <div className="p-8">
        <p className="text-stone-500">Event not found.</p>
      </div>
    );
  }

  const plans = event.floorPlans || [];
  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];

  function addTab() {
    if (!newTabName.trim()) return;
    const newPlan: FloorPlan = { id: uuid(), name: newTabName.trim(), json: null };
    updateEvent(eventId, { floorPlans: [...plans, newPlan] });
    setActivePlanId(newPlan.id);
    setNewTabName("");
    setShowAddTab(false);
  }

  return (
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
        <span className="text-xs text-stone-400 hidden sm:inline">Auto-saved</span>
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

      {/* Editor */}
      <div className="flex-1">
        {activePlan && (
          <FloorPlanEditor
            key={activePlan.id}
            eventId={eventId}
            initialJSON={activePlan.json}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}
