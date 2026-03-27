"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEvent } from "@/hooks/useStore";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

const ReadOnlyCanvas = dynamic(
  () => import("@/components/client/ClientFloorPlanView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-stone-100">
        <p className="text-stone-400 text-sm">Loading floor plan...</p>
      </div>
    ),
  }
);

export default function ClientFloorPlanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const [activeTab, setActiveTab] = useState(0);

  if (!event) {
    return <div className="p-8 text-stone-500">Event not found.</div>;
  }

  // Get floor plans that have content
  const plans = (event.floorPlans ?? []).filter((fp) => fp.json);
  const hasLegacy = !!event.floorPlanJSON;

  if (plans.length === 0 && !hasLegacy) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-stone-500">Floor plan not ready yet.</p>
        <Link href={`/client/${eventId}`} className="text-rose-500 hover:underline text-sm mt-2">
          Back to portal
        </Link>
      </div>
    );
  }

  // Use multi-tab plans if available, otherwise fall back to legacy single plan
  const activePlan = plans.length > 0
    ? plans[Math.min(activeTab, plans.length - 1)]
    : null;
  const activeJSON = activePlan?.json ?? event.floorPlanJSON!;

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b border-stone-200 flex-shrink-0">
        <div className="h-11 md:h-12 flex items-center px-4 gap-3">
          <Link
            href={`/client/${eventId}`}
            className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
          >
            <ArrowLeft size={14} />
            Back to Portal
          </Link>
          <div className="w-px h-5 bg-stone-200" />
          <h2 className="text-sm font-medium text-stone-800 truncate">
            {event.name} — Floor Plan
          </h2>
        </div>

        {plans.length > 1 && (
          <div className="flex gap-1 px-4 pb-2">
            {plans.map((fp, i) => (
              <button
                key={fp.id}
                onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  i === activeTab
                    ? "bg-rose-50 text-rose-600"
                    : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                }`}
              >
                {fp.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1">
        <ReadOnlyCanvas key={activeJSON} floorPlanJSON={activeJSON} />
      </div>
    </div>
  );
}
