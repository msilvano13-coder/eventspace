"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, CheckCircle2, XCircle, PartyPopper, Loader2, CalendarDays, MapPin } from "lucide-react";
import {
  fetchRsvpEventInfo,
  lookupRsvpGuest,
  submitRsvp,
  type RsvpEventInfo,
  type RsvpGuest,
} from "@/lib/supabase/rsvp";

type Phase = "search" | "form" | "confirmed";

export default function RsvpPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [event, setEvent] = useState<RsvpEventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("search");

  // Search state
  const [name, setName] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [matches, setMatches] = useState<RsvpGuest[]>([]);

  // Form state
  const [guest, setGuest] = useState<RsvpGuest | null>(null);
  const [rsvp, setRsvp] = useState<"accepted" | "declined">("accepted");
  const [mealChoice, setMealChoice] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [plusOneName, setPlusOneName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetchRsvpEventInfo(shareToken).then((info) => {
      setEvent(info);
      setLoading(false);
    });
  }, [shareToken]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSearching(true);
    setSearchError("");
    setMatches([]);

    const results = await lookupRsvpGuest(shareToken, name.trim());
    setSearching(false);

    if (results.length === 0) {
      setSearchError("We couldn\u2019t find that name. Please try the full name as it appears on your invitation.");
      return;
    }

    if (results.length === 1) {
      selectGuest(results[0]);
      return;
    }

    // Multiple matches — let guest pick
    setMatches(results);
  }

  function selectGuest(g: RsvpGuest) {
    setGuest(g);
    setRsvp(g.rsvp === "declined" ? "declined" : "accepted");
    setMealChoice(g.mealChoice);
    setDietaryNotes(g.dietaryNotes);
    setPlusOneName(g.plusOneName);
    setPhase("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guest) return;
    setSubmitting(true);
    setSubmitError("");

    const ok = await submitRsvp(shareToken, guest.id, {
      rsvp,
      mealChoice: rsvp === "accepted" ? mealChoice : "",
      dietaryNotes: rsvp === "accepted" ? dietaryNotes : "",
      plusOneName: rsvp === "accepted" ? plusOneName : "",
    });

    setSubmitting(false);
    if (ok) {
      setPhase("confirmed");
    } else {
      setSubmitError("Something went wrong. Please try again.");
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-rose-400" size={28} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-heading text-xl font-semibold text-stone-800 mb-2">Event Not Found</h1>
          <p className="text-sm text-stone-500">This RSVP link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center px-4 py-10">
      {/* Event header */}
      <div className="text-center mb-8 max-w-lg">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500 text-white font-heading font-bold text-lg mb-4">
          E
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
          {event.name}
        </h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-stone-500">
          {event.date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-rose-400" />
              {formatDate(event.date)}
            </span>
          )}
          {event.venue && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-rose-400" />
              {event.venue}
            </span>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-6 sm:p-8">
          {/* ── SEARCH PHASE ── */}
          {phase === "search" && (
            <>
              <h2 className="font-heading text-lg font-semibold text-stone-800 text-center mb-1">
                Find Your RSVP
              </h2>
              <p className="text-sm text-stone-500 text-center mb-6">
                Enter your name as it appears on the invitation.
              </p>

              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">Full Name</label>
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
                </div>

                {searchError && (
                  <p className="text-xs text-red-500">{searchError}</p>
                )}

                {/* Multiple matches */}
                {matches.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs text-stone-500">Multiple guests found. Please select yours:</p>
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
                  {searching ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  Find My RSVP
                </button>
              </form>
            </>
          )}

          {/* ── FORM PHASE ── */}
          {phase === "form" && guest && (
            <>
              <h2 className="font-heading text-lg font-semibold text-stone-800 text-center mb-1">
                Hi, {guest.name.split(" ")[0]}!
              </h2>
              <p className="text-sm text-stone-500 text-center mb-6">
                Will you be joining us?
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* RSVP choice */}
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

                {/* Additional fields only if accepting */}
                {rsvp === "accepted" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Meal Preference
                      </label>
                      <input
                        type="text"
                        value={mealChoice}
                        onChange={(e) => setMealChoice(e.target.value)}
                        placeholder="e.g. Chicken, Fish, Vegetarian"
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">
                        Dietary Restrictions
                      </label>
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
                        <label className="block text-xs font-medium text-stone-600 mb-1.5">
                          Plus-One Name
                        </label>
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

                {submitError && (
                  <p className="text-xs text-red-500">{submitError}</p>
                )}

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
                  onClick={() => {
                    setPhase("search");
                    setGuest(null);
                    setMatches([]);
                  }}
                  className="w-full text-xs text-stone-400 hover:text-stone-600 py-1"
                >
                  Not you? Search again
                </button>
              </form>
            </>
          )}

          {/* ── CONFIRMED PHASE ── */}
          {phase === "confirmed" && guest && (
            <div className="text-center py-4">
              {rsvp === "accepted" ? (
                <>
                  <PartyPopper size={36} className="mx-auto text-rose-400 mb-4" />
                  <h2 className="font-heading text-lg font-semibold text-stone-800 mb-2">
                    We can&apos;t wait to see you!
                  </h2>
                  <p className="text-sm text-stone-500">
                    Your RSVP has been recorded, {guest.name.split(" ")[0]}.
                    {mealChoice && <> You selected <strong>{mealChoice}</strong>.</>}
                    {plusOneName && <> Your plus-one <strong>{plusOneName}</strong> is noted.</>}
                  </p>
                </>
              ) : (
                <>
                  <XCircle size={36} className="mx-auto text-stone-300 mb-4" />
                  <h2 className="font-heading text-lg font-semibold text-stone-800 mb-2">
                    We&apos;ll miss you!
                  </h2>
                  <p className="text-sm text-stone-500">
                    Your response has been recorded. We hope to celebrate with you another time.
                  </p>
                </>
              )}
              <button
                onClick={() => {
                  setPhase("search");
                  setGuest(null);
                  setName("");
                  setMatches([]);
                }}
                className="mt-6 text-xs text-rose-500 hover:text-rose-600 font-medium"
              >
                RSVP for another guest
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-stone-300 mt-6">
          Powered by EventSpace
        </p>
      </div>
    </div>
  );
}
