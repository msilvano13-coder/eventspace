/**
 * Shows a loading skeleton while the event store is hydrating.
 * Use this BEFORE the "event not found" guard in any page that calls useEvent().
 *
 * Usage:
 *   const loading = useEventsLoading();
 *   const event = useEvent(eventId);
 *   if (loading) return <EventLoader />;
 *   if (!event) return <NotFound />;
 */
export default function EventLoader({ className }: { className?: string }) {
  return (
    <div className={className ?? "min-h-screen flex items-center justify-center bg-stone-50"}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        <p className="text-sm text-stone-400 animate-pulse">Loading event...</p>
      </div>
    </div>
  );
}
