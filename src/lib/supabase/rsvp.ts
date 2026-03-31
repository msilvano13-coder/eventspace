import { createClient } from "@/lib/supabase/client";

export interface RsvpEventInfo {
  id: string;
  name: string;
  date: string;
  venue: string;
  clientName: string;
}

export interface RsvpGuest {
  id: string;
  name: string;
  email: string;
  rsvp: "pending" | "accepted" | "declined";
  mealChoice: string;
  dietaryNotes: string;
  plusOne: boolean;
  plusOneName: string;
}

export async function fetchRsvpEventInfo(
  shareToken: string
): Promise<RsvpEventInfo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rsvp_get_event_info", {
    p_share_token: shareToken,
  });
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    date: data.date || "",
    venue: data.venue || "",
    clientName: data.client_name || "",
  };
}

export async function lookupRsvpGuest(
  shareToken: string,
  name: string
): Promise<RsvpGuest[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rsvp_lookup_guest", {
    p_share_token: shareToken,
    p_name: name,
  });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((g) => ({
    id: g.id as string,
    name: g.name as string,
    email: g.email as string,
    rsvp: g.rsvp as "pending" | "accepted" | "declined",
    mealChoice: (g.meal_choice as string) || "",
    dietaryNotes: (g.dietary_notes as string) || "",
    plusOne: (g.plus_one as boolean) || false,
    plusOneName: (g.plus_one_name as string) || "",
  }));
}

export async function submitRsvp(
  shareToken: string,
  guestId: string,
  data: {
    rsvp: "accepted" | "declined";
    mealChoice: string;
    dietaryNotes: string;
    plusOneName: string;
  }
): Promise<boolean> {
  const supabase = createClient();
  const { data: result, error } = await supabase.rpc("rsvp_update_guest", {
    p_share_token: shareToken,
    p_guest_id: guestId,
    p_rsvp: data.rsvp,
    p_meal_choice: data.mealChoice,
    p_dietary_notes: data.dietaryNotes,
    p_plus_one_name: data.plusOneName,
  });
  if (error) {
    console.error("RSVP submit failed:", error);
    return false;
  }
  return result === true;
}
