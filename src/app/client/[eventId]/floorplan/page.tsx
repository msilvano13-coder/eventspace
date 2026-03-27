"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEvent } from "@/hooks/useStore";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

  if (!event) {
    return <div className="p-8 text-stone-500">Event not found.</div>;
  }

  if (!event.floorPlanJSON) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-stone-500">Floor plan not ready yet.</p>
        <Link href={`/client/${eventId}`} className="text-rose-500 hover:underline text-sm mt-2">
          Back to portal
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="h-11 md:h-12 bg-white border-b border-stone-200 flex items-center px-4 gap-3 flex-shrink-0">
        <Link
          href={`/client/${eventId}`}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft size={14} />
          Back to Portal
        </Link>
        <div className="w-px h-5 bg-stone-200" />
        <h2 className="text-sm font-medium text-stone-800 truncate">
          {event.name} - Floor Plan
        </h2>
      </div>
      <div className="flex-1">
        <ReadOnlyCanvas floorPlanJSON={event.floorPlanJSON} />
      </div>
    </div>
  );
}
