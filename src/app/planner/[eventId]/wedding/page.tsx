"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEvent, useEventSubEntities, useStoreActions, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import {
  ArrowLeft,
  Globe,
  Eye,
  Copy,
  Check,
  Plus,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
import {
  WeddingVenueDetails,
  WeddingTravelItem,
  WeddingFaqItem,
  WeddingRegistryLink,
} from "@/lib/types";
import { uploadToStorage, getSignedUrl } from "@/lib/supabase/storage";
import { getUserId } from "@/lib/supabase/db";
import { compressImageToBlob } from "@/lib/image-compress";

const DEFAULT_SECTIONS = ["hero", "story", "schedule", "venue", "rsvp", "faq", "travel", "registry", "gallery"];

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Banner",
  story: "Our Story",
  schedule: "Schedule",
  venue: "Venue",
  rsvp: "RSVP",
  faq: "Q&A",
  travel: "Travel & Accommodations",
  registry: "Registry",
  gallery: "Gallery (from Mood Board)",
};

export default function WeddingEditorPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["schedule", "moodBoard"]);
  const { updateEvent } = useStoreActions();

  // ── Form state ──
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState("");
  const [headline, setHeadline] = useState("");
  const [story, setStory] = useState("");
  const [heroPath, setHeroPath] = useState("");
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [venueDetails, setVenueDetails] = useState<WeddingVenueDetails>({});
  const [travelInfo, setTravelInfo] = useState<WeddingTravelItem[]>([]);
  const [faq, setFaq] = useState<WeddingFaqItem[]>([]);
  const [registryLinks, setRegistryLinks] = useState<WeddingRegistryLink[]>([]);
  const [sectionsOrder, setSectionsOrder] = useState<string[]>(DEFAULT_SECTIONS);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [copied, setCopied] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  // ── Hydrate from event ──
  useEffect(() => {
    if (!event) return;
    setEnabled(event.weddingPageEnabled);
    setSlug(event.weddingSlug || "");
    setHeadline(event.weddingHeadline || "");
    setStory(event.weddingStory || "");
    setHeroPath(event.weddingHeroStoragePath || "");
    setVenueDetails(event.weddingVenueDetails || {});
    setTravelInfo(event.weddingTravelInfo || []);
    setFaq(event.weddingFaq || []);
    setRegistryLinks(event.weddingRegistryLinks || []);
    setSectionsOrder(event.weddingSectionsOrder?.length ? event.weddingSectionsOrder : DEFAULT_SECTIONS);
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load hero preview ──
  useEffect(() => {
    if (!heroPath) { setHeroPreviewUrl(null); return; }
    getSignedUrl("event-files", heroPath).then(setHeroPreviewUrl).catch(() => setHeroPreviewUrl(null));
  }, [heroPath]);

  // ── Slug validation ──
  function normalizeSlug(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }

  // ── Hero upload ──
  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !event) return;
    setUploadingHero(true);
    try {
      const userId = await getUserId();
      const compressed = await compressImageToBlob(file);
      const path = `${userId}/${eventId}/wedding-hero.jpg`;
      await uploadToStorage("event-files", path, compressed.full);
      setHeroPath(path);
      const url = await getSignedUrl("event-files", path);
      setHeroPreviewUrl(url);
    } catch (err) {
      console.error("Hero upload failed:", err);
    }
    setUploadingHero(false);
  }

  // ── Save ──
  async function handleSave() {
    if (!event) return;
    const trimmedSlug = normalizeSlug(slug);
    if (enabled && !trimmedSlug) {
      setSlugError("URL slug is required when the page is enabled.");
      return;
    }
    setSlugError("");
    setSaving(true);

    try {
      await updateEvent(eventId, {
        weddingPageEnabled: enabled,
        weddingSlug: trimmedSlug || null,
        weddingHeadline: headline,
        weddingStory: story,
        weddingHeroStoragePath: heroPath,
        weddingVenueDetails: venueDetails,
        weddingTravelInfo: travelInfo,
        weddingFaq: faq,
        weddingRegistryLinks: registryLinks,
        weddingSectionsOrder: sectionsOrder,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save wedding page failed:", err);
    }
    setSaving(false);
  }

  function copyLink() {
    const url = `${window.location.origin}/w/${normalizeSlug(slug)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;

  if (!event) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Event not found.</p>
        <Link href="/planner" className="text-rose-500 hover:underline text-sm mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const previewUrl = slug ? `/w/${normalizeSlug(slug)}` : null;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/planner/${eventId}`} className="text-stone-400 hover:text-stone-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-bold text-stone-900 flex items-center gap-2">
            <Globe size={20} className="text-rose-500" />
            Wedding Website
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">{event.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {previewUrl && enabled && (
            <>
              <button onClick={copyLink} className="inline-flex items-center gap-1.5 text-xs border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors">
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors">
                <Eye size={12} />
                Preview
              </a>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* ── Enable toggle ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <h3 className="text-sm font-semibold text-stone-800">Publish Wedding Website</h3>
              <p className="text-xs text-stone-400 mt-0.5">When enabled, your page is publicly accessible</p>
            </div>
            <div
              onClick={() => setEnabled(!enabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-rose-500" : "bg-stone-200"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
            </div>
          </label>
        </div>

        {/* ── URL Slug ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Page URL</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 whitespace-nowrap">{typeof window !== "undefined" ? window.location.origin : ""}/w/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(normalizeSlug(e.target.value)); setSlugError(""); }}
              placeholder="mike-and-ashley"
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>
          {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
        </div>

        {/* ── Hero Section ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Hero Banner</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Mike & Ashley"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
              <p className="text-[11px] text-stone-400 mt-1">Defaults to event name if blank</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Hero Photo</label>
              {heroPreviewUrl ? (
                <div className="relative rounded-xl overflow-hidden h-40 bg-stone-100">
                  <img src={heroPreviewUrl} alt="Hero" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setHeroPath(""); setHeroPreviewUrl(null); }}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-lg p-1.5 shadow"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-colors">
                  {uploadingHero ? (
                    <Loader2 size={20} className="animate-spin text-rose-400" />
                  ) : (
                    <>
                      <Upload size={20} className="text-stone-300 mb-2" />
                      <span className="text-xs text-stone-400">Click to upload a photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleHeroUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* ── Our Story ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Our Story</h3>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Tell your love story..."
            rows={5}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none resize-y"
          />
        </div>

        {/* ── Venue Details ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Venue Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Address</label>
              <input
                type="text"
                value={venueDetails.address || ""}
                onChange={(e) => setVenueDetails({ ...venueDetails, address: e.target.value })}
                placeholder="123 Wedding Lane, City, State"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Description</label>
              <textarea
                value={venueDetails.description || ""}
                onChange={(e) => setVenueDetails({ ...venueDetails, description: e.target.value })}
                placeholder="A beautiful garden estate..."
                rows={2}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Google Maps Link</label>
              <input
                type="url"
                value={venueDetails.mapUrl || ""}
                onChange={(e) => setVenueDetails({ ...venueDetails, mapUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Parking Notes</label>
              <input
                type="text"
                value={venueDetails.parkingNotes || ""}
                onChange={(e) => setVenueDetails({ ...venueDetails, parkingNotes: e.target.value })}
                placeholder="Free valet parking available"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-800">Questions & Answers</h3>
            <button
              onClick={() => setFaq([...faq, { id: uuid(), question: "", answer: "" }])}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <div key={item.id} className="border border-stone-100 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => {
                        const updated = [...faq];
                        updated[i] = { ...item, question: e.target.value };
                        setFaq(updated);
                      }}
                      placeholder="Is there a dress code?"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                    />
                    <textarea
                      value={item.answer}
                      onChange={(e) => {
                        const updated = [...faq];
                        updated[i] = { ...item, answer: e.target.value };
                        setFaq(updated);
                      }}
                      placeholder="Cocktail attire is suggested..."
                      rows={2}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none resize-y"
                    />
                  </div>
                  <button
                    onClick={() => setFaq(faq.filter((f) => f.id !== item.id))}
                    className="text-stone-300 hover:text-red-500 mt-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {faq.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-3">No questions yet. Add common questions your guests might have.</p>
            )}
          </div>
        </div>

        {/* ── Travel Info ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-800">Travel & Accommodations</h3>
            <button
              onClick={() => setTravelInfo([...travelInfo, { id: uuid(), title: "", description: "", url: "" }])}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-3">
            {travelInfo.map((item, i) => (
              <div key={item.id} className="border border-stone-100 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const updated = [...travelInfo];
                        updated[i] = { ...item, title: e.target.value };
                        setTravelInfo(updated);
                      }}
                      placeholder="e.g. Hotel Block — Marriott Downtown"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                    />
                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...travelInfo];
                        updated[i] = { ...item, description: e.target.value };
                        setTravelInfo(updated);
                      }}
                      placeholder="Use code WEDDING2026 for the group rate..."
                      rows={2}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none resize-y"
                    />
                    <input
                      type="url"
                      value={item.url || ""}
                      onChange={(e) => {
                        const updated = [...travelInfo];
                        updated[i] = { ...item, url: e.target.value };
                        setTravelInfo(updated);
                      }}
                      placeholder="https://... (optional link)"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setTravelInfo(travelInfo.filter((t) => t.id !== item.id))}
                    className="text-stone-300 hover:text-red-500 mt-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {travelInfo.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-3">Add hotel blocks, airport info, shuttle details, etc.</p>
            )}
          </div>
        </div>

        {/* ── Registry Links ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-800">Registry</h3>
            <button
              onClick={() => setRegistryLinks([...registryLinks, { id: uuid(), name: "", url: "" }])}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-3">
            {registryLinks.map((link, i) => (
              <div key={link.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={link.name}
                  onChange={(e) => {
                    const updated = [...registryLinks];
                    updated[i] = { ...link, name: e.target.value };
                    setRegistryLinks(updated);
                  }}
                  placeholder="e.g. Amazon"
                  className="w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => {
                    const updated = [...registryLinks];
                    updated[i] = { ...link, url: e.target.value };
                    setRegistryLinks(updated);
                  }}
                  placeholder="https://..."
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
                <button
                  onClick={() => setRegistryLinks(registryLinks.filter((r) => r.id !== link.id))}
                  className="text-stone-300 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {registryLinks.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-3">Add links to your Amazon, Zola, or other registries.</p>
            )}
          </div>
        </div>

        {/* ── Section Order ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Section Order</h3>
          <p className="text-xs text-stone-400 mb-3">Drag to reorder. Empty sections are automatically hidden.</p>
          <div className="space-y-2">
            {sectionsOrder.map((key, i) => (
              <div key={key} className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    disabled={i === 0}
                    onClick={() => {
                      const arr = [...sectionsOrder];
                      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                      setSectionsOrder(arr);
                    }}
                    className="text-stone-300 hover:text-stone-500 disabled:opacity-30 text-[10px]"
                  >
                    &#9650;
                  </button>
                  <button
                    disabled={i === sectionsOrder.length - 1}
                    onClick={() => {
                      const arr = [...sectionsOrder];
                      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                      setSectionsOrder(arr);
                    }}
                    className="text-stone-300 hover:text-stone-500 disabled:opacity-30 text-[10px]"
                  >
                    &#9660;
                  </button>
                </div>
                <span className="text-sm text-stone-700 flex-1">
                  {SECTION_LABELS[key] || key}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Info notes ── */}
        <div className="bg-rose-50 rounded-xl border border-rose-100 p-5 text-xs text-rose-600 space-y-2">
          <p><strong>Schedule:</strong> The timeline shown on your wedding page comes from your event&apos;s Day-of Schedule. <Link href={`/planner/${eventId}`} className="underline">Edit it on the event page</Link>.</p>
          <p><strong>Gallery:</strong> Photos are pulled from your <Link href={`/planner/${eventId}/moodboard`} className="underline">Mood Board</Link>.</p>
          <p><strong>RSVP:</strong> Guests search by name and submit their response. Responses appear on your <Link href={`/planner/${eventId}/guests`} className="underline">Guests</Link> page.</p>
        </div>

        {/* Bottom save */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
            {saved ? "Saved!" : "Save Wedding Website"}
          </button>
        </div>
      </div>
    </div>
  );
}
