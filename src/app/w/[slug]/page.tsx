"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  MapPin,
  Clock,
  Heart,
  Search,
  CheckCircle2,
  XCircle,
  PartyPopper,
  Loader2,
  ExternalLink,
  HelpCircle,
  Plane,
  Gift,
  ChevronDown,
} from "lucide-react";
import {
  fetchWeddingPage,
  weddingRsvpLookup,
  weddingRsvpSubmit,
  getWeddingImageUrl,
  type WeddingPageData,
  type RsvpGuest,
} from "@/lib/supabase/wedding";

// ── Helpers ──

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(time24: string) {
  if (!time24 || !time24.includes(":")) return time24;
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  try {
    const wedding = new Date(dateStr);
    const now = new Date();
    const diff = wedding.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return null;
  }
}

// ── Section Components ──

function HeroSection({ data, heroUrl }: { data: WeddingPageData; heroUrl: string | null }) {
  const days = daysUntil(data.date);

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center text-center px-4">
      {/* Background image */}
      {heroUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroUrl})` }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}
      {!heroUrl && (
        <div className="absolute inset-0 bg-gradient-to-b from-rose-50 via-white to-stone-50" />
      )}

      <div className="relative z-10 max-w-2xl">
        <p className={`text-sm tracking-[0.3em] uppercase mb-6 ${heroUrl ? "text-white/80" : "text-rose-400"}`}>
          We&apos;re getting married
        </p>
        <h1 className={`font-heading text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight ${heroUrl ? "text-white" : "text-stone-900"}`}>
          {data.headline || data.name}
        </h1>
        {data.date && (
          <p className={`text-lg sm:text-xl mb-2 ${heroUrl ? "text-white/90" : "text-stone-600"}`}>
            {formatDate(data.date)}
          </p>
        )}
        {data.venue && (
          <p className={`text-base sm:text-lg mb-8 ${heroUrl ? "text-white/80" : "text-stone-500"}`}>
            {data.venue}
          </p>
        )}
        {days !== null && days > 0 && (
          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium ${heroUrl ? "bg-white/20 backdrop-blur-sm text-white" : "bg-rose-50 text-rose-600"}`}>
            <Heart size={16} />
            {days} {days === 1 ? "day" : "days"} to go
          </div>
        )}
        {/* Scroll indicator */}
        <div className={`mt-12 animate-bounce ${heroUrl ? "text-white/60" : "text-stone-300"}`}>
          <ChevronDown size={24} className="mx-auto" />
        </div>
      </div>
    </section>
  );
}

function StorySection({ story }: { story: string }) {
  if (!story) return null;
  return (
    <section id="story" className="py-20 px-4 bg-white">
      <div className="max-w-2xl mx-auto text-center">
        <Heart size={20} className="mx-auto text-rose-400 mb-4" />
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 mb-8">
          Our Story
        </h2>
        <div className="text-stone-600 leading-relaxed whitespace-pre-line text-base sm:text-lg">
          {story}
        </div>
      </div>
    </section>
  );
}

function ScheduleSection({ schedule }: { schedule: WeddingPageData["schedule"] }) {
  if (!schedule || schedule.length === 0) return null;
  return (
    <section id="schedule" className="py-20 px-4 bg-stone-50">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <Clock size={20} className="mx-auto text-rose-400 mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            Schedule
          </h2>
        </div>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-rose-200 hidden sm:block" />
          <div className="space-y-6">
            {schedule.map((item, i) => (
              <div key={i} className="flex gap-4 sm:gap-6">
                <div className="hidden sm:flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-rose-400 ring-4 ring-rose-100 z-10" />
                </div>
                <div className="flex-1 bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-stone-900">{item.title}</h3>
                      {item.notes && (
                        <p className="text-sm text-stone-500 mt-1">{item.notes}</p>
                      )}
                    </div>
                    {item.time && (
                      <span className="text-sm font-medium text-rose-500 whitespace-nowrap">
                        {formatTime(item.time)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VenueSection({ venue, venueDetails }: { venue: string; venueDetails: WeddingPageData["venueDetails"] }) {
  const hasDetails = venue || venueDetails.address || venueDetails.description || venueDetails.mapUrl;
  if (!hasDetails) return null;

  return (
    <section id="venue" className="py-20 px-4 bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <MapPin size={20} className="mx-auto text-rose-400 mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            Venue
          </h2>
        </div>
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 sm:p-8">
          {venue && (
            <h3 className="font-heading text-xl font-semibold text-stone-900 mb-2">{venue}</h3>
          )}
          {venueDetails.address && (
            <p className="text-stone-600 mb-4">{venueDetails.address}</p>
          )}
          {venueDetails.description && (
            <p className="text-stone-500 text-sm mb-6 leading-relaxed">{venueDetails.description}</p>
          )}
          {venueDetails.parkingNotes && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Parking</p>
              <p className="text-sm text-stone-600">{venueDetails.parkingNotes}</p>
            </div>
          )}
          {venueDetails.mapUrl && (
            <a
              href={venueDetails.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-rose-500 hover:text-rose-600 font-medium"
            >
              <MapPin size={14} />
              View on Google Maps
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function RsvpSection({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<"search" | "form" | "confirmed">("search");
  const [name, setName] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [matches, setMatches] = useState<RsvpGuest[]>([]);
  const [guest, setGuest] = useState<RsvpGuest | null>(null);
  const [rsvp, setRsvp] = useState<"accepted" | "declined">("accepted");
  const [mealChoice, setMealChoice] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [plusOneName, setPlusOneName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function selectGuest(g: RsvpGuest) {
    setGuest(g);
    setRsvp(g.rsvp === "declined" ? "declined" : "accepted");
    setMealChoice(g.mealChoice);
    setDietaryNotes(g.dietaryNotes);
    setPlusOneName(g.plusOneName);
    setPhase("form");
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSearching(true);
    setSearchError("");
    setMatches([]);

    const results = await weddingRsvpLookup(slug, name.trim());
    setSearching(false);

    if (results.length === 0) {
      setSearchError("We couldn\u2019t find that name. Please try the full name as it appears on your invitation.");
      return;
    }
    if (results.length === 1) {
      selectGuest(results[0]);
      return;
    }
    setMatches(results);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guest) return;
    setSubmitting(true);
    setSubmitError("");

    const ok = await weddingRsvpSubmit(slug, guest.id, {
      rsvp,
      mealChoice: rsvp === "accepted" ? mealChoice : "",
      dietaryNotes: rsvp === "accepted" ? dietaryNotes : "",
      plusOneName: rsvp === "accepted" ? plusOneName : "",
    });

    setSubmitting(false);
    if (ok) setPhase("confirmed");
    else setSubmitError("Something went wrong. Please try again.");
  }

  return (
    <section id="rsvp" className="py-20 px-4 bg-stone-50">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <CalendarDays size={20} className="mx-auto text-rose-400 mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            RSVP
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-6 sm:p-8">
          {/* Search */}
          {phase === "search" && (
            <>
              <p className="text-sm text-stone-500 text-center mb-6">
                Enter your name as it appears on the invitation.
              </p>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    required
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none pr-10"
                  />
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300" />
                </div>
                {searchError && <p className="text-xs text-red-500">{searchError}</p>}
                {matches.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs text-stone-500">Multiple guests found:</p>
                    {matches.map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => selectGuest(m)}
                        className="w-full text-left border border-stone-200 rounded-xl px-4 py-3 hover:border-rose-300 hover:bg-rose-50/50 transition-colors"
                      >
                        <span className="text-sm font-medium text-stone-800">{m.name}</span>
                        {m.email && (
                          <span className="text-xs text-stone-400 ml-2">
                            {m.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={searching || !name.trim()}
                  className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Find My RSVP
                </button>
              </form>
            </>
          )}

          {/* Form */}
          {phase === "form" && guest && (
            <>
              <h3 className="font-heading text-lg font-semibold text-stone-800 text-center mb-1">
                Hi, {guest.name.split(" ")[0]}!
              </h3>
              <p className="text-sm text-stone-500 text-center mb-6">Will you be joining us?</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRsvp("accepted")}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all text-sm font-medium ${
                      rsvp === "accepted"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-stone-200 text-stone-400 hover:border-stone-300"
                    }`}
                  >
                    <CheckCircle2 size={22} />
                    Joyfully Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvp("declined")}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all text-sm font-medium ${
                      rsvp === "declined"
                        ? "border-red-300 bg-red-50 text-red-600"
                        : "border-stone-200 text-stone-400 hover:border-stone-300"
                    }`}
                  >
                    <XCircle size={22} />
                    Regretfully Decline
                  </button>
                </div>

                {rsvp === "accepted" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Meal Preference</label>
                      <input
                        type="text"
                        value={mealChoice}
                        onChange={(e) => setMealChoice(e.target.value)}
                        placeholder="e.g. Chicken, Fish, Vegetarian"
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Dietary Restrictions</label>
                      <input
                        type="text"
                        value={dietaryNotes}
                        onChange={(e) => setDietaryNotes(e.target.value)}
                        placeholder="e.g. Gluten-free, nut allergy"
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                      />
                    </div>
                    {guest.plusOne && (
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1.5">Plus-One Name</label>
                        <input
                          type="text"
                          value={plusOneName}
                          onChange={(e) => setPlusOneName(e.target.value)}
                          placeholder="Guest name"
                          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                        />
                      </div>
                    )}
                  </>
                )}

                {submitError && <p className="text-xs text-red-500">{submitError}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Submit RSVP
                </button>
                <button
                  type="button"
                  onClick={() => { setPhase("search"); setGuest(null); setMatches([]); }}
                  className="w-full text-xs text-stone-400 hover:text-stone-600 py-1"
                >
                  Not you? Search again
                </button>
              </form>
            </>
          )}

          {/* Confirmed */}
          {phase === "confirmed" && guest && (
            <div className="text-center py-4">
              {rsvp === "accepted" ? (
                <>
                  <PartyPopper size={36} className="mx-auto text-rose-400 mb-4" />
                  <h3 className="font-heading text-lg font-semibold text-stone-800 mb-2">
                    We can&apos;t wait to see you!
                  </h3>
                  <p className="text-sm text-stone-500">
                    Your RSVP has been recorded, {guest.name.split(" ")[0]}.
                    {mealChoice && <> You selected <strong>{mealChoice}</strong>.</>}
                  </p>
                </>
              ) : (
                <>
                  <XCircle size={36} className="mx-auto text-stone-300 mb-4" />
                  <h3 className="font-heading text-lg font-semibold text-stone-800 mb-2">
                    We&apos;ll miss you!
                  </h3>
                  <p className="text-sm text-stone-500">
                    Your response has been recorded. We hope to celebrate another time.
                  </p>
                </>
              )}
              <button
                onClick={() => { setPhase("search"); setGuest(null); setName(""); setMatches([]); }}
                className="mt-6 text-xs text-rose-500 hover:text-rose-600 font-medium"
              >
                RSVP for another guest
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ faq }: { faq: WeddingPageData["faq"] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!faq || faq.length === 0) return null;

  return (
    <section id="faq" className="py-20 px-4 bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <HelpCircle size={20} className="mx-auto text-rose-400 mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            Questions & Answers
          </h2>
        </div>
        <div className="space-y-3">
          {faq.map((item) => (
            <div
              key={item.id}
              className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
              >
                <span className="text-sm font-medium text-stone-800">{item.question}</span>
                <ChevronDown
                  size={16}
                  className={`text-stone-400 transition-transform ${openId === item.id ? "rotate-180" : ""}`}
                />
              </button>
              {openId === item.id && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-stone-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TravelSection({ travelInfo }: { travelInfo: WeddingPageData["travelInfo"] }) {
  if (!travelInfo || travelInfo.length === 0) return null;
  return (
    <section id="travel" className="py-20 px-4 bg-stone-50">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <Plane size={20} className="mx-auto text-rose-400 mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            Travel & Accommodations
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {travelInfo.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-medium text-stone-900 mb-2">{item.title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{item.description}</p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-medium mt-3"
                >
                  More info <ExternalLink size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RegistrySection({ registryLinks }: { registryLinks: WeddingPageData["registryLinks"] }) {
  if (!registryLinks || registryLinks.length === 0) return null;
  return (
    <section id="registry" className="py-20 px-4 bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <Gift size={20} className="mx-auto text-rose-400 mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            Registry
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {registryLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-stone-50 hover:bg-rose-50 rounded-xl border border-stone-200 hover:border-rose-200 p-5 transition-colors group"
            >
              <span className="font-medium text-stone-800 group-hover:text-rose-700">{link.name}</span>
              <ExternalLink size={16} className="text-stone-300 group-hover:text-rose-400" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section map ──

const SECTION_RENDERERS: Record<string, string> = {
  hero: "hero",
  story: "story",
  schedule: "schedule",
  venue: "venue",
  rsvp: "rsvp",
  faq: "faq",
  travel: "travel",
  registry: "registry",
};

// ── Main Page ──

export default function WeddingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<WeddingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchWeddingPage(slug).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [slug]);

  // Load hero image
  useEffect(() => {
    if (!data?.heroStoragePath || !data.slug) return;
    getWeddingImageUrl(data.slug, data.heroStoragePath).then(setHeroUrl);
  }, [data]);

  const renderSection = useCallback(
    (sectionKey: string) => {
      if (!data) return null;
      switch (sectionKey) {
        case "hero":
          return <HeroSection key="hero" data={data} heroUrl={heroUrl} />;
        case "story":
          return <StorySection key="story" story={data.story} />;
        case "schedule":
          return <ScheduleSection key="schedule" schedule={data.schedule} />;
        case "venue":
          return <VenueSection key="venue" venue={data.venue} venueDetails={data.venueDetails} />;
        case "rsvp":
          return <RsvpSection key="rsvp" slug={slug} />;
        case "faq":
          return <FaqSection key="faq" faq={data.faq} />;
        case "travel":
          return <TravelSection key="travel" travelInfo={data.travelInfo} />;
        case "registry":
          return <RegistrySection key="registry" registryLinks={data.registryLinks} />;
        default:
          return null;
      }
    },
    [data, heroUrl, slug]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-rose-400" size={28} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-heading text-xl font-semibold text-stone-800 mb-2">Page Not Found</h1>
          <p className="text-sm text-stone-500">This wedding page doesn&apos;t exist or hasn&apos;t been published yet.</p>
        </div>
      </div>
    );
  }

  // Sticky nav
  const navItems = data.sectionsOrder.filter(
    (s) => s !== "hero" && SECTION_RENDERERS[s]
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-12">
          <span className="font-heading text-sm font-semibold text-stone-800 truncate max-w-[120px] sm:max-w-none">
            {data.headline || data.name}
          </span>
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {navItems.map((s) => (
              <a
                key={s}
                href={`#${s}`}
                className="text-xs text-stone-500 hover:text-rose-500 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors whitespace-nowrap capitalize"
              >
                {s === "faq" ? "Q&A" : s}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Sections in configured order */}
      {data.sectionsOrder.map((sectionKey) => renderSection(sectionKey))}

      {/* Footer */}
      <footer className="py-8 text-center text-[11px] text-stone-300 bg-stone-50">
        Powered by EventSpace
      </footer>
    </div>
  );
}
