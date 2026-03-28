"use client";

import { useEvents, useStoreActions, usePreferredVendors, usePreferredVendorActions } from "@/hooks/useStore";
import { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, Star, Phone, Globe, Plus, ChevronDown, ExternalLink, AlertTriangle, Compass, Share2, UserPlus, Heart } from "lucide-react";
import type { VendorCategory, Vendor, DiscoveredVendor, PreferredVendor } from "@/lib/types";

const ALL_CATEGORIES: ("all" | VendorCategory)[] = [
  "all", "catering", "photography", "videography", "music", "flowers",
  "cake", "venue", "hair & makeup", "transport", "officiant", "other",
];

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
  all: "bg-stone-100 text-stone-600",
};

interface DiscoverVendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  phone: string;
  website: string;
  address: string;
  priceLevel: number;
  googleMapsUrl: string;
  photoUrl: string | null;
}

function mapToVendorCategory(cat: string): VendorCategory {
  const valid: VendorCategory[] = [
    "catering", "photography", "videography", "music", "flowers",
    "cake", "venue", "hair & makeup", "transport", "officiant", "other",
  ];
  return valid.includes(cat as VendorCategory) ? (cat as VendorCategory) : "other";
}

export default function DiscoverPage() {
  const events = useEvents();
  const { updateEvent } = useStoreActions();
  const preferredVendors = usePreferredVendors();
  const { addPreferredVendor, removePreferredVendor } = usePreferredVendorActions();

  const [location, setLocation] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [category, setCategory] = useState<"all" | VendorCategory>("all");
  const [radius, setRadius] = useState(25);
  const [vendors, setVendors] = useState<DiscoverVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openShareDropdown, setOpenShareDropdown] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "", category: "photography" as VendorCategory, phone: "", website: "", address: "", rating: "", reviewCount: "",
  });
  const [manualShareEvent, setManualShareEvent] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!location.trim() && !nameSearch.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        category,
        location: location.trim(),
        radius: String(radius),
      });
      if (nameSearch.trim()) params.set("name", nameSearch.trim());
      const res = await fetch(`/api/discover?${params}`);
      const data = await res.json();
      setVendors(data.vendors || []);
      setIsDemo(data.demo || false);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [location, nameSearch, category, radius]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const addVendorToEvent = useCallback(
    (vendor: DiscoverVendor, eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const newVendor: Vendor = {
        id: crypto.randomUUID(),
        name: vendor.name,
        category: mapToVendorCategory(vendor.category),
        contact: vendor.name,
        phone: vendor.phone,
        email: vendor.website ? vendor.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "",
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
    (vendor: DiscoverVendor, eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      // Check if already shared
      const existing = (event.discoveredVendors || []).find((v) => v.name === vendor.name && v.phone === vendor.phone);
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

  const togglePreferred = useCallback(
    (vendor: DiscoverVendor) => {
      const existing = preferredVendors.find(
        (v) => v.name.toLowerCase() === vendor.name.toLowerCase() && v.phone === vendor.phone
      );
      if (existing) {
        removePreferredVendor(existing.id);
        showToast(`Removed ${vendor.name} from preferred vendors`);
      } else {
        const pv: PreferredVendor = {
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
          notes: "",
          addedAt: new Date().toISOString(),
        };
        addPreferredVendor(pv);
        showToast(`Added ${vendor.name} to preferred vendors`);
      }
    },
    [preferredVendors, addPreferredVendor, removePreferredVendor, showToast]
  );

  const isVendorPreferred = useCallback(
    (vendor: DiscoverVendor) => {
      return preferredVendors.some(
        (v) => v.name.toLowerCase() === vendor.name.toLowerCase() && v.phone === vendor.phone
      );
    },
    [preferredVendors]
  );

  const submitManualVendor = useCallback(() => {
    if (!manualForm.name.trim() || !manualShareEvent) return;
    const event = events.find((e) => e.id === manualShareEvent);
    if (!event) return;

    const shared: DiscoveredVendor = {
      id: crypto.randomUUID(),
      name: manualForm.name.trim(),
      category: manualForm.category,
      rating: parseFloat(manualForm.rating) || 0,
      reviewCount: parseInt(manualForm.reviewCount) || 0,
      phone: manualForm.phone.trim(),
      website: manualForm.website.trim().startsWith("http") ? manualForm.website.trim() : manualForm.website.trim() ? `https://${manualForm.website.trim()}` : "",
      address: manualForm.address.trim(),
      priceLevel: 2,
      googleMapsUrl: manualForm.name.trim() ? `https://www.google.com/maps/search/${encodeURIComponent(manualForm.name.trim())}` : "",
      sharedAt: new Date().toISOString(),
    };

    updateEvent(manualShareEvent, {
      discoveredVendors: [...(event.discoveredVendors || []), shared],
    });

    showToast(`Shared ${manualForm.name} to ${event.name} client portal`);
    setManualForm({ name: "", category: "photography", phone: "", website: "", address: "", rating: "", reviewCount: "" });
    setManualShareEvent("");
    setShowManualForm(false);
  }, [manualForm, manualShareEvent, events, updateEvent, showToast]);

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
        <h1 className="text-2xl font-heading font-bold text-stone-800">Vendor Search</h1>
        <p className="text-sm text-stone-400 mt-1">Find local wedding professionals</p>
      </div>

      {/* Demo mode banner */}
      {isDemo && searched && !loading && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span>Demo mode &mdash; add your <code className="bg-amber-100 px-1 rounded text-xs">GOOGLE_PLACES_API_KEY</code> environment variable for live results</span>
        </div>
      )}

      {/* Search controls */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Name / keyword search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Business name or keyword..."
              className="w-full border border-stone-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>

          {/* Location input */}
          <div className="relative flex-1">
            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="City or zip code..."
              className="w-full border border-stone-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>

          {/* Category dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "all" | VendorCategory)}
            className="border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white capitalize"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>

          {/* Radius selector */}
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
          >
            <option value={10}>10 miles</option>
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
          </select>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={loading || (!location.trim() && !nameSearch.trim())}
            className="bg-rose-400 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 justify-center shrink-0"
          >
            <Search size={15} />
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {!searched && !loading && (
        <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center shadow-soft">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center">
              <Compass size={32} className="text-rose-300" />
            </div>
          </div>
          <p className="text-stone-800 font-medium">Search for vendors in your area</p>
          <p className="text-sm text-stone-400 mt-1">Enter a city or zip code to discover local wedding professionals</p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft animate-pulse">
              <div className="h-5 bg-stone-100 rounded-lg w-3/4 mb-3" />
              <div className="h-4 bg-stone-100 rounded-lg w-1/3 mb-3" />
              <div className="h-3 bg-stone-50 rounded-lg w-full mb-2" />
              <div className="h-3 bg-stone-50 rounded-lg w-2/3 mb-2" />
              <div className="h-3 bg-stone-50 rounded-lg w-1/2 mb-4" />
              <div className="flex gap-2">
                <div className="h-8 bg-stone-100 rounded-lg flex-1" />
                <div className="h-8 bg-stone-100 rounded-lg flex-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {searched && !loading && vendors.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
          <p className="text-sm text-stone-400">No vendors found. Try a different location or category.</p>
        </div>
      )}

      {searched && !loading && vendors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" ref={dropdownRef}>
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft flex flex-col"
            >
              {/* Name & category */}
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-stone-800 leading-tight">{vendor.name}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_COLORS[vendor.category] || CATEGORY_COLORS.other}`}>
                    {vendor.category}
                  </span>
                  {renderPrice(vendor.priceLevel)}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5 mb-3">
                {renderStars(vendor.rating)}
                <span className="text-xs text-stone-600 font-medium">{vendor.rating.toFixed(1)}</span>
                <span className="text-xs text-stone-400">({vendor.reviewCount})</span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 mb-4 flex-1">
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

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-auto">
                <div className="flex gap-2">
                  {/* Add to Event dropdown */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => { setOpenDropdown(openDropdown === vendor.id ? null : vendor.id); setOpenShareDropdown(null); }}
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
                            onClick={() => addVendorToEvent(vendor, event.id)}
                            className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            {event.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Google Maps link */}
                  <a
                    href={vendor.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-stone-50 text-stone-600 hover:bg-stone-100 transition-colors shrink-0"
                  >
                    <ExternalLink size={12} />
                    Maps
                  </a>
                </div>

                {/* Add to Preferred */}
                <button
                  onClick={() => togglePreferred(vendor)}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-colors ${
                    isVendorPreferred(vendor)
                      ? "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100"
                      : "text-stone-500 hover:text-rose-600 hover:bg-rose-50 border-stone-200 hover:border-rose-200"
                  }`}
                >
                  <Heart size={11} className={isVendorPreferred(vendor) ? "fill-rose-500" : ""} />
                  {isVendorPreferred(vendor) ? "Preferred ✓" : "Add to Preferred"}
                </button>

                {/* Share to Client Portal */}
                <div className="relative">
                  <button
                    onClick={() => { setOpenShareDropdown(openShareDropdown === vendor.id ? null : vendor.id); setOpenDropdown(null); }}
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

      {/* Manual Entry Section */}
      <div className="mt-8 bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <UserPlus size={15} className="text-teal-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-stone-800">Can&apos;t find a vendor?</p>
              <p className="text-xs text-stone-400">Manually add and share a vendor to a client portal</p>
            </div>
          </div>
          <ChevronDown size={16} className={`text-stone-400 transition-transform ${showManualForm ? "rotate-180" : ""}`} />
        </button>

        {showManualForm && (
          <div className="px-5 pb-5 border-t border-stone-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-500 mb-1">Business Name *</label>
                <input
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  placeholder="e.g. Michael Silvano Photography"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
                <select
                  value={manualForm.category}
                  onChange={(e) => setManualForm({ ...manualForm, category: e.target.value as VendorCategory })}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white capitalize"
                >
                  {ALL_CATEGORIES.filter((c) => c !== "all").map((cat) => (
                    <option key={cat} value={cat}>{String(cat).charAt(0).toUpperCase() + String(cat).slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Phone</label>
                <input
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  placeholder="(781) 258-6848"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Website</label>
                <input
                  value={manualForm.website}
                  onChange={(e) => setManualForm({ ...manualForm, website: e.target.value })}
                  placeholder="www.example.com"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Address</label>
                <input
                  value={manualForm.address}
                  onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
                  placeholder="Wakefield, MA"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Google Rating</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={manualForm.rating}
                  onChange={(e) => setManualForm({ ...manualForm, rating: e.target.value })}
                  placeholder="5.0"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Review Count</label>
                <input
                  type="number"
                  min="0"
                  value={manualForm.reviewCount}
                  onChange={(e) => setManualForm({ ...manualForm, reviewCount: e.target.value })}
                  placeholder="74"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-500 mb-1">Share to Event *</label>
                <select
                  value={manualShareEvent}
                  onChange={(e) => setManualShareEvent(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                >
                  <option value="">Select an event...</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>{evt.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setShowManualForm(false)}
                className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitManualVendor}
                disabled={!manualForm.name.trim() || !manualShareEvent}
                className="flex items-center gap-1.5 text-xs font-medium bg-teal-500 text-white px-4 py-2 rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Share2 size={12} />
                Share to Client Portal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
