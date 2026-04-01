import { createClient } from "@supabase/supabase-js";

// Server-side notification helper — uses service role to insert notifications
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function notifyEventOwner({
  eventId,
  actorUserId,
  type,
  title,
  message,
  metadata = {},
}: {
  eventId: string;
  actorUserId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  // Look up the event owner
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("user_id, name")
    .eq("id", eventId)
    .single();

  if (!event) return;

  // Don't notify if the actor is the owner
  if (event.user_id === actorUserId) return;

  await supabaseAdmin.from("notifications").insert({
    user_id: event.user_id,
    type,
    title,
    message,
    metadata: { ...metadata, eventId, eventName: event.name },
  });
}
