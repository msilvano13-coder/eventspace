"use client";

import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, useStoreActions, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import WeddingEditor from "@/components/wedding/WeddingEditor";
import { Event } from "@/lib/types";
import { uploadToStorage } from "@/lib/supabase/storage";
import { getUserId } from "@/lib/supabase/db";
import { compressImageToBlob } from "@/lib/image-compress";

export default function ClientWeddingEditorPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["schedule", "moodBoard"]);
  const { updateEvent } = useStoreActions();

  if (loading) return <EventLoader />;

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <p className="text-stone-500 mb-2">Event not found or link is invalid.</p>
          <p className="text-xs text-stone-400">Please check your link and try again.</p>
        </div>
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
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <WeddingEditor
          event={event}
          onSave={handleSave}
          onHeroUpload={handleHeroUpload}
          backHref={`/client/${eventId}`}
          infoNotes={
            <>
              <p><strong>Schedule:</strong> The timeline on your wedding page comes from the Day-of Schedule on your portal.</p>
              <p><strong>RSVP:</strong> Guests search by name and submit their response. You&apos;ll see responses in the Guest List.</p>
            </>
          }
        />
      </div>
    </div>
  );
}
