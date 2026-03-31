"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEvent, useEventSubEntities, useStoreActions, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import WeddingEditor from "@/components/wedding/WeddingEditor";
import { Event } from "@/lib/types";
import { uploadToStorage } from "@/lib/supabase/storage";
import { getUserId } from "@/lib/supabase/db";
import { compressImageToBlob } from "@/lib/image-compress";

export default function WeddingEditorPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["schedule", "moodBoard"]);
  const { updateEvent } = useStoreActions();

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;

  if (!event) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Event not found.</p>
        <Link href="/planner" className="text-rose-500 hover:underline text-sm mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  async function handleSave(fields: Partial<Event>) {
    await updateEvent(eventId, fields);
  }

  async function handleHeroUpload(file: File): Promise<string> {
    const userId = await getUserId();
    const compressed = await compressImageToBlob(file);
    const path = `${userId}/${eventId}/wedding-hero.jpg`;
    await uploadToStorage("event-files", path, compressed.full);
    return path;
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <WeddingEditor
        event={event}
        onSave={handleSave}
        onHeroUpload={handleHeroUpload}
        backHref={`/planner/${eventId}`}
        infoNotes={
          <>
            <p><strong>Schedule:</strong> The timeline shown on your wedding page comes from your event&apos;s Day-of Schedule. <Link href={`/planner/${eventId}`} className="underline">Edit it on the event page</Link>.</p>
            <p><strong>RSVP:</strong> Guests search by name and submit their response. Responses appear on your <Link href={`/planner/${eventId}/guests`} className="underline">Guests</Link> page.</p>
          </>
        }
      />
    </div>
  );
}
