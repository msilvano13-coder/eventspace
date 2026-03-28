"use client";

import { usePreferredVendors, usePreferredVendorActions, useEvents, useStoreActions } from "@/hooks/useStore";
import { useState, useCallback, useRef } from "react";
import { Heart, Star, MapPin, Phone, Globe, ExternalLink, Trash2, Plus, ChevronDown, Search, Share2 } from "lucide-react";
import type { PreferredVendor, Vendor, VendorCategory, DiscoveredVendor } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const CATEGORY_COLORS: Record<string, string> = {
  catering: "bg-orange-50 text-orange-600",
  photography: "bg-blue-50 text-blue-600",
  videography: "bg-purple-50 text-purple-600",
  music: "bg-pink-50 text-pink-600",
  flowers: "bg-emerald-50 text-emerald-600",
  cake: "bg-amber-50 text-amber-600",
  venue: "bg-rose-50 text-rose-600",
  "hair & makeup": "bg-fuchsia-50 text-fuchsia-600",
  transport: "bg-cyan-50 text-cyan-600",
  officiant: "bg-indigo-50 text-indigo-600",
  other: "bg-stone-100 text-stone-600",
};

function mapToVendorCategory(cat: string): VendorCategory {
  const valid: VendorCategory[] = [
    "catering", "photography", "videography", "music", "flowers",
    "cake", "venue", "hair & makeup", "transport", "officiant", "other",
  ];
  return valid.includes(cat as VendorCategory) ? (cat as VendorCategory) : "other";
}

export default function PreferredVendorsPage() {
  const preferredVendors = usePreferredVendors();
  const { removePreferredVendor, updatePreferredVendor } = usePreferredVendorActions();
  const events = useEvents();
  const { updateEvent } = useStoreActions();

  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openShareDropdown, setOpenShareDropdown] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Get unique categories from saved vendors
  const categories = Array.from(new Set(preferredVendors.map((v) => v.category))).sort();

  const filtered = preferredVendors.filter((v) => {
    const matchesSearch =
      !filter ||
      v.name.toLowerCase().includes(filter.toLowerCase()) ||
      v.address.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const addToEvent = useCallback(
    (vendor: PreferredVendor, eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const newVendor: Vendor = {
        id: crypto.randomUUID(),
        name: vendor.name,
        category: mapToVendorCategory(vendor.category),
        contact: vendor.name,
        phone: vendor.phone || "",
        email: "",
        notes: "",
        mealChoice: "",
        contractTotal: 0,
        payments: [],
      };

      updateEvent(eventId, {
        vendors: [...(event.vendors || []), newVendor],
      });

      setOpenDropdown(null);
      showToast(`Added ${vendor.name} to ${event.name}`);
    },
    [events, updateEvent, showToast]
  );

  const shareToClientPortal = useCallback(
    (vendor: PreferredVendor, eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const existing = (event.discoveredVendors || []).find(
        (v) => v.name === vendor.name && v.phone === vendor.phone
      );
      if (existing) {
        setOpenShareDropdown(null);
        showToast(`${vendor.name} already shared to ${event.name}`);
        return;
      }

      const shared: DiscoveredVendor = {
        id: crypto.randomUUID(),
        name: vendor.name,
        category: vendor.category,
        rating: vendor.rating,
        reviewCount: vendor.reviewCount,
        phone: vendor.phone,
        website: vendor.website,
        address: vendor.address,
        priceLevel: vendor.priceLevel,
        googleMapsUrl: vendor.googleMapsUrl,
        sharedAt: new Date().toISOString(),
      };

      updateEvent(eventId, {
        discoveredVendors: [...(event.discoveredVendors || []), shared],
      });

      setOpenShareDropdown(null);
      showToast(`Shared ${vendor.name} to ${event.name} client portal`);
    },
    [events, updateEvent, showToast]
  );

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.3;
    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            className={
              i < full
                ? "text-amber-400 fill-amber-400"
                : i === full && hasHalf
                ? "text-amber-400 fill-amber-200"
                : "text-stone-200"
            }
          />
        ))}
      </span>
    );
  };

  const renderPrice = (level: number) => (
    <span className="text-xs">
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className={i < level ? "text-emerald-600" : "text-stone-200"}>
          $
        </span>
      ))}
    </span>
  );

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
            <Heart size={18} className="text-rose-400 fill-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-stone-800">Preferred Vendors</h1>
            <p className="text-sm text-stone-400 mt-0.5">
              {preferredVendors.length} saved vendor{preferredVendors.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      {preferredVendors.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search preferred vendors..."
                className="w-full border border-stone-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white capitalize"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Empty state */}
      {preferredVendors.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center shadow-soft">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center">
              <Heart size={32} className="text-rose-300" />
            </div>
          </div>
          <p className="text-stone-800 font-medium">No preferred vendors yet</p>
          <p className="text-sm text-stone-400 mt-1">
            Search for vendors and click the heart to add them to your preferred list
          </p>
          <a
            href="/planner/discover"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-rose-400 text-white text-sm font-medium hover:bg-rose-500 transition-colors"
          >
            <Search size={15} />
            Search Vendors
          </a>
        </div>
      )}

      {/* No results for filter */}
      {preferredVendors.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
          <p className="text-sm text-stone-400">No vendors match your filter.</p>
        </div>
      )}

      {/* Vendor grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft flex flex-col group relative"
            >
              {/* Remove button */}
              <button
                onClick={() => setConfirmDeleteId(vendor.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove from preferred"
              >
                <Trash2 size={14} />
              </button>

              {/* Preferred badge */}
              <div className="absolute top-3 left-3">
                <Heart size={14} className="text-rose-400 fill-rose-400" />
              </div>

              {/* Name & category */}
              <div className="mb-2 mt-1">
                <h3 className="text-sm font-semibold text-stone-800 leading-tight pl-6">{vendor.name}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                      CATEGORY_COLORS[vendor.category] || CATEGORY_COLORS.other
                    }`}
                  >
                    {vendor.category}
                  </span>
                  {renderPrice(vendor.priceLevel)}
                </div>
              </div>

              {/* Rating */}
              {vendor.rating > 0 && (
                <div className="flex items-center gap-1.5 mb-3">
                  {renderStars(vendor.rating)}
                  <span className="text-xs text-stone-600 font-medium">{vendor.rating.toFixed(1)}</span>
                  <span className="text-xs text-stone-400">({vendor.reviewCount})</span>
                </div>
              )}

              {/* Details */}
              <div className="space-y-1.5 mb-3 flex-1">
                {vendor.address && (
                  <p className="flex items-start gap-1.5 text-xs text-stone-500">
                    <MapPin size={11} className="text-stone-400 mt-0.5 shrink-0" />
                    <span>{vendor.address}</span>
                  </p>
                )}
                {vendor.phone && (
                  <p className="flex items-center gap-1.5 text-xs text-stone-500">
                    <Phone size={11} className="text-stone-400 shrink-0" />
                    <a href={`tel:${vendor.phone}`} className="hover:text-rose-500 transition-colors">
                      {vendor.phone}
                    </a>
                  </p>
                )}
                {vendor.website && (
                  <p className="flex items-center gap-1.5 text-xs text-stone-500 min-w-0">
                    <Globe size={11} className="text-stone-400 shrink-0" />
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-rose-500 transition-colors truncate"
                    >
                      {vendor.website.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="mb-3">
                {editingNotes === vendor.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add notes..."
                      rows={2}
                      className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none resize-none"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => setEditingNotes(null)}
                        className="text-[10px] text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          updatePreferredVendor(vendor.id, { notes: notesValue });
                          setEditingNotes(null);
                        }}
                        className="text-[10px] font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingNotes(vendor.id);
                      setNotesValue(vendor.notes || "");
                    }}
                    className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {vendor.notes ? (
                      <span className="text-stone-500 italic">&ldquo;{vendor.notes}&rdquo;</span>
                    ) : (
                      "+ Add notes"
                    )}
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-auto">
                <div className="flex gap-2">
                  {/* Add to Event dropdown */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => {
                        setOpenDropdown(openDropdown === vendor.id ? null : vendor.id);
                        setOpenShareDropdown(null);
                      }}
                      disabled={events.length === 0}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={13} />
                      Add to Event
                      <ChevronDown size={11} />
                    </button>
                    {openDropdown === vendor.id && events.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                        {events.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => addToEvent(vendor, event.id)}
                            className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            {event.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Google Maps link */}
                  {vendor.googleMapsUrl && (
                    <a
                      href={vendor.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-stone-50 text-stone-600 hover:bg-stone-100 transition-colors shrink-0"
                    >
                      <ExternalLink size={12} />
                      Maps
                    </a>
                  )}
                </div>

                {/* Share to Client Portal */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setOpenShareDropdown(openShareDropdown === vendor.id ? null : vendor.id);
                      setOpenDropdown(null);
                    }}
                    disabled={events.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-stone-500 hover:text-teal-600 hover:bg-teal-50 border border-stone-200 hover:border-teal-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Share2 size={11} />
                    Share to Client Portal
                  </button>
                  {openShareDropdown === vendor.id && events.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                      {events.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => shareToClientPortal(vendor, event.id)}
                          className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          {event.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Remove Preferred Vendor?"
        message="This vendor will be removed from your preferred vendors list."
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmDeleteId) {
            const v = preferredVendors.find((x) => x.id === confirmDeleteId);
            removePreferredVendor(confirmDeleteId);
            if (v) showToast(`Removed ${v.name} from preferred vendors`);
          }
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
