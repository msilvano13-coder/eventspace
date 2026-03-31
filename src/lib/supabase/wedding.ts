import { createClient } from "@/lib/supabase/client";

// ── Types ──

export interface WeddingPageData {
  id: string;
  name: string;
  date: string;
  venue: string;
  slug: string;
  headline: string;
  story: string;
  heroStoragePath: string;
  venueDetails: VenueDetails;
  travelInfo: TravelItem[];
  faq: FaqItem[];
  registryLinks: RegistryLink[];
  sectionsOrder: string[];
  schedule: ScheduleEntry[];
  colorPalette: string[];
}

export interface VenueDetails {
  address?: string;
  mapUrl?: string;
  parkingNotes?: string;
  description?: string;
}

export interface TravelItem {
  id: string;
  title: string;        // e.g. "Hotel Block", "Airport"
  description: string;  // details
  url?: string;         // optional link
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface RegistryLink {
  id: string;
  name: string;  // e.g. "Amazon", "Zola", "Crate & Barrel"
  url: string;
}

export interface ScheduleEntry {
  time: string;
  title: string;
  notes: string;
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

// ── Fetch wedding page by slug ──

export async function fetchWeddingPage(slug: string): Promise<WeddingPageData | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("wedding_get_page", { p_slug: slug });
  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    date: data.date || "",
    venue: data.venue || "",
    slug: slug,
    headline: data.headline || "",
    story: data.story || "",
    heroStoragePath: data.heroStoragePath || "",
    venueDetails: data.venueDetails || {},
    travelInfo: data.travelInfo || [],
    faq: data.faq || [],
    registryLinks: data.registryLinks || [],
    sectionsOrder: data.sectionsOrder || ["hero", "story", "schedule", "venue", "rsvp", "faq", "travel", "registry"],
    schedule: data.schedule || [],
    colorPalette: data.colorPalette || [],
  };
}

// ── RSVP via slug ──

export async function weddingRsvpLookup(slug: string, name: string): Promise<RsvpGuest[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("wedding_rsvp_lookup", {
    p_slug: slug,
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

export async function weddingRsvpSubmit(
  slug: string,
  guestId: string,
  data: {
    rsvp: "accepted" | "declined";
    mealChoice: string;
    dietaryNotes: string;
    plusOneName: string;
  }
): Promise<boolean> {
  const supabase = createClient();
  const { data: result, error } = await supabase.rpc("wedding_rsvp_submit", {
    p_slug: slug,
    p_guest_id: guestId,
    p_rsvp: data.rsvp,
    p_meal_choice: data.mealChoice,
    p_dietary_notes: data.dietaryNotes,
    p_plus_one_name: data.plusOneName,
  });
  if (error) {
    console.error("Wedding RSVP submit failed:", error);
    return false;
  }
  return result === true;
}

// ── Get signed URL for hero image ──

export async function getWeddingImageUrl(
  slug: string,
  storagePath: string
): Promise<string | null> {
  try {
    const res = await fetch("/api/storage/wedding-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        path: storagePath,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.url || null;
  } catch {
    return null;
  }
}
