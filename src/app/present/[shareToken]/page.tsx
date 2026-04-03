"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useClientEvent } from "@/hooks/useClientStore";
import { clientApproveLayout } from "@/lib/supabase/db";
import { CalendarDays, MapPin, Maximize, Minimize, Copy, Check, ThumbsUp, MessageSquare, X } from "lucide-react";
import type { FloorPlan } from "@/lib/types";

const FloorPlan3DView = dynamic(
  () => import("@/components/floorplan/FloorPlan3DView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-stone-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading 3D view...</p>
        </div>
      </div>
    ),
  }
);

export default function PresentationPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { event, loading, refetch } = useClientEvent(shareToken);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-stone-900">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm font-body">Loading presentation...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!event) {
    return (
      <div className="h-dvh flex items-center justify-center bg-stone-900">
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-6 h-6 text-white/40" />
          </div>
          <h1 className="text-white text-lg font-heading mb-2">Link Expired or Invalid</h1>
          <p className="text-white/40 text-sm font-body">
            This presentation link is no longer available. Please contact your event planner for an updated link.
          </p>
        </div>
      </div>
    );
  }

  // Deduplicate floor plans by name (legacy bug can create duplicates, prefer ones with saved JSON)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const plans: FloorPlan[] = (() => {
    const uuidPlans = (event.floorPlans ?? []).filter((fp) => UUID_RE.test(fp.id));
    const seen = new Map<string, FloorPlan>();
    for (const fp of uuidPlans) {
      const existing = seen.get(fp.name);
      if (!existing || (!existing.json && fp.json)) {
        seen.set(fp.name, fp);
      }
    }
    return Array.from(seen.values());
  })();
  const activePlan = plans[activeIndex] ?? plans[0];

  // No floor plans
  if (!activePlan) {
    return (
      <div className="h-dvh flex items-center justify-center bg-stone-900">
        <div className="text-center max-w-sm px-6">
          <h1 className="text-white text-lg font-heading mb-2">{event.name}</h1>
          <p className="text-white/40 text-sm font-body">
            No floor plans have been created for this event yet.
          </p>
        </div>
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await clientApproveLayout(shareToken, "approved");
      refetch();
    } catch { /* silent */ }
    setSubmitting(false);
  };

  const handleRequestChanges = async () => {
    if (!feedbackNote.trim()) return;
    setSubmitting(true);
    try {
      await clientApproveLayout(shareToken, "changes_requested", feedbackNote.trim());
      setShowFeedback(false);
      setFeedbackNote("");
      refetch();
    } catch { /* silent */ }
    setSubmitting(false);
  };

  const approvalStatus = event.layoutApprovalStatus;

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="h-dvh flex flex-col bg-stone-900 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 flex items-center justify-between bg-stone-900/90 backdrop-blur border-b border-white/10 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="text-white font-heading text-base sm:text-lg truncate">
            {event.name}
          </h1>
          {event.venue && (
            <span className="hidden sm:flex items-center gap-1 text-white/40 text-xs flex-shrink-0">
              <MapPin className="w-3 h-3" />
              {event.venue}
            </span>
          )}
          {formattedDate && (
            <span className="hidden sm:flex items-center gap-1 text-white/40 text-xs flex-shrink-0">
              <CalendarDays className="w-3 h-3" />
              {formattedDate}
            </span>
          )}
        </div>
        <button
          onClick={toggleFullscreen}
          className="text-white/40 hover:text-white transition p-1.5 rounded hover:bg-white/10"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </header>

      {/* Floor plan tabs (only if multiple) */}
      {plans.length > 1 && (
        <nav className="flex-shrink-0 flex gap-1 px-4 py-2 bg-stone-900/80 backdrop-blur border-b border-white/10 overflow-x-auto z-10">
          {plans.map((plan, i) => (
            <button
              key={plan.id}
              onClick={() => setActiveIndex(i)}
              className={`px-3 py-1.5 text-xs font-body rounded-md transition whitespace-nowrap ${
                i === activeIndex
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              {plan.name || `Floor Plan ${i + 1}`}
            </button>
          ))}
        </nav>
      )}

      {/* 3D Viewer — fills remaining space */}
      <main className="flex-1 relative min-h-0">
        <FloorPlan3DView
          key={activePlan.id}
          floorPlanJSON={activePlan.json}
          lightingZones={activePlan.lightingZones}
          lightingEnabled={true}
          tablescapes={event.tablescapes ?? []}
          presentationMode
          initialSettings={activePlan.view3dSettings}
        />
      </main>

      {/* Feedback modal */}
      {showFeedback && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-stone-800 rounded-xl p-5 mx-4 max-w-sm w-full border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-heading">Request Changes</h3>
              <button onClick={() => setShowFeedback(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Describe what you'd like changed..."
              className="w-full bg-stone-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-body placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowFeedback(false)}
                className="px-3 py-1.5 text-xs font-body rounded-md text-white/50 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={submitting || !feedbackNote.trim()}
                className="px-3 py-1.5 text-xs font-body rounded-md bg-amber-500/90 text-white hover:bg-amber-500 transition disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between bg-stone-900/90 backdrop-blur border-t border-white/10 z-10">
        <div className="flex items-center gap-3">
          {event.venue && (
            <span className="text-white/30 text-xs font-body sm:hidden flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {event.venue}
            </span>
          )}
          {approvalStatus === "approved" && (
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-body">
              <Check className="w-3 h-3" />
              Layout Approved
            </span>
          )}
          {approvalStatus === "changes_requested" && (
            <span className="flex items-center gap-1 text-amber-400 text-xs font-body">
              <MessageSquare className="w-3 h-3" />
              Changes Requested
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body rounded-md bg-white/10 text-white/60 hover:text-white hover:bg-white/15 transition"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy Link
              </>
            )}
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body rounded-md bg-white/10 text-white/60 hover:text-white hover:bg-white/15 transition"
          >
            <MessageSquare className="w-3 h-3" />
            Request Changes
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting || approvalStatus === "approved"}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-body rounded-md transition ${
              approvalStatus === "approved"
                ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                : "bg-emerald-500/90 text-white hover:bg-emerald-500 disabled:opacity-50"
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
            {approvalStatus === "approved" ? "Approved" : submitting ? "..." : "Approve Layout"}
          </button>
        </div>
      </footer>
    </div>
  );
}
