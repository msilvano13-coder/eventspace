"use client";

import { useEvents, useStoreActions, usePlannerProfile } from "@/hooks/useStore";
import { Plus, Calendar, MapPin, User, ChevronRight, Archive, RotateCcw, Search, X, SlidersHorizontal, Lock } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { canCreateEvent } from "@/lib/plan-features";

const statusColors: Record<string, string> = {
  planning: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-stone-100 text-stone-500",
};

type Tab = "active" | "archived";

type StatusFilter = "all" | "planning" | "confirmed" | "completed";
type SortOption = "date-asc" | "date-desc" | "name" | "recent";

export default function PlannerDashboard() {
  const events = useEvents();
  const { createEvent, updateEvent } = useStoreActions();
  const profile = usePlannerProfile();
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-asc");
  const [showFilters, setShowFilters] = useState(false);

  const activeEvents = events.filter((e) => !e.archivedAt);
  const archivedEvents = events.filter((e) => !!e.archivedAt);

  const displayed = useMemo(() => {
    const base = events.filter((e) => tab === "active" ? !e.archivedAt : !!e.archivedAt);
    const q = search.toLowerCase().trim();

    // Filter by search query
    let filtered = q
      ? base.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.clientName.toLowerCase().includes(q) ||
            e.venue.toLowerCase().includes(q) ||
            e.clientEmail.toLowerCase().includes(q)
        )
      : base;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case "date-asc":
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "date-desc":
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "recent":
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }
    return sorted;
  }, [events, tab, search, statusFilter, sortBy]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all" || sortBy !== "date-asc";

  function archiveEvent(id: string) {
    updateEvent(id, { archivedAt: new Date().toISOString() });
  }

  function restoreEvent(id: string) {
    updateEvent(id, { archivedAt: null });
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-800">Events</h1>
          <p className="text-sm text-stone-400 mt-1">
            {activeEvents.length} active{archivedEvents.length > 0 ? ` · ${archivedEvents.length} archived` : ""}
          </p>
        </div>
        {canCreateEvent(profile.plan, activeEvents.length) ? (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-soft"
          >
            <Plus size={16} />
            New Event
          </button>
        ) : (
          <Link
            href="/planner/upgrade"
            className="flex items-center gap-2 bg-stone-200 text-stone-500 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Lock size={16} />
            Upgrade for More Events
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === "active"
              ? "bg-white text-stone-800 shadow-sm"
              : "text-stone-400 hover:text-stone-600"
          }`}
        >
          Active
          {activeEvents.length > 0 && (
            <span className="ml-1.5 text-[10px] font-semibold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">
              {activeEvents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === "archived"
              ? "bg-white text-stone-800 shadow-sm"
              : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <Archive size={13} className="inline mr-1.5 -mt-0.5" />
          Archived
          {archivedEvents.length > 0 && (
            <span className="ml-1.5 text-[10px] font-semibold bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full">
              {archivedEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-5 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event name, client, or venue…"
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-300 hover:text-stone-500 rounded"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-rose-50 text-rose-600 border-rose-200"
                : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
            }`}
          >
            <SlidersHorizontal size={13} />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            )}
          </button>

          {/* Status pills — always visible as quick filters */}
          {(["all", "planning", "confirmed", "completed"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-medium px-3 py-2 rounded-xl border transition-colors ${
                statusFilter === s
                  ? s === "all"
                    ? "bg-stone-800 text-white border-stone-800"
                    : s === "planning"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : s === "confirmed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-stone-100 text-stone-600 border-stone-300"
                  : "bg-white text-stone-400 border-stone-200 hover:border-stone-300 hover:text-stone-600"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}

          <div className="flex-1" />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs font-medium text-stone-500 bg-white border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-rose-400 cursor-pointer"
          >
            <option value="date-asc">Date (soonest)</option>
            <option value="date-desc">Date (latest)</option>
            <option value="name">Name A–Z</option>
            <option value="recent">Recently updated</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); setSortBy("date-asc"); }}
              className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1.5 rounded-lg transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Result count when filtering */}
        {hasActiveFilters && (
          <p className="text-xs text-stone-400">
            {displayed.length} event{displayed.length !== 1 ? "s" : ""} found
            {search && <span> matching &ldquo;{search}&rdquo;</span>}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {displayed.map((event) => (
          <div
            key={event.id}
            className={`bg-white rounded-2xl border border-stone-200 shadow-soft hover:shadow-card transition-all group relative ${
              tab === "archived" ? "opacity-75" : ""
            }`}
          >
            <Link
              href={`/planner/${event.id}`}
              className="block p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-heading font-semibold text-stone-800 group-hover:text-rose-500 transition-colors">
                  {event.name}
                </h3>
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusColors[event.status] ?? "bg-stone-100 text-stone-500"}`}
                >
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>
              <div className="space-y-2 text-sm text-stone-500">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-stone-400" />
                  {new Date(event.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-stone-400" />
                  {event.venue}
                </div>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-stone-400" />
                  {event.clientName}
                </div>
              </div>
              {(event.colorPalette ?? []).length > 0 && (
                <div className="flex gap-1.5 mt-3">
                  {(event.colorPalette ?? []).map((color) => (
                    <div
                      key={color}
                      className="w-5 h-5 rounded-full ring-1 ring-stone-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                <span>
                  {event.timeline.filter((t) => t.completed).length}/{event.timeline.length} to-dos · {(event.schedule ?? []).length} timeline moments
                </span>
                <div className="flex items-center gap-1">
                  {tab === "active" ? (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); archiveEvent(event.id); }}
                      className="p-1.5 text-stone-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                      title="Archive event"
                    >
                      <Archive size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); restoreEvent(event.id); }}
                      className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Restore event"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  <ChevronRight
                    size={14}
                    className="group-hover:translate-x-1 transition-transform text-stone-300"
                  />
                </div>
              </div>
            </Link>

          </div>
        ))}
        {displayed.length === 0 && (
          <div className="col-span-full text-center py-16">
            {hasActiveFilters ? (
              <div>
                <Search size={24} className="text-stone-200 mx-auto mb-3" />
                <p className="text-stone-300 text-sm">No events match your filters.</p>
                <button
                  onClick={() => { setSearch(""); setStatusFilter("all"); setSortBy("date-asc"); }}
                  className="text-xs text-rose-400 hover:text-rose-500 mt-2 font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : tab === "active" ? (
              <p className="text-stone-300 text-sm">No active events — create one to get started.</p>
            ) : (
              <div>
                <Archive size={24} className="text-stone-200 mx-auto mb-3" />
                <p className="text-stone-300 text-sm">No archived events.</p>
                <p className="text-stone-300 text-xs mt-1">Completed events can be archived to keep your dashboard clean.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <NewEventModal
          onClose={() => setShowModal(false)}
          onCreate={(data) => {
            createEvent(data);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function NewEventModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: any) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    date: "",
    venue: "",
    clientName: "",
    clientEmail: "",
  });

  return (
    <div
      className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 shadow-xl">
        <h2 className="text-lg font-heading font-semibold text-stone-800 mb-5">
          New Event
        </h2>
        <div className="space-y-3.5">
          {[
            { key: "name", label: "Event Name", type: "text", placeholder: "Johnson Wedding" },
            { key: "date", label: "Date", type: "date", placeholder: "" },
            { key: "venue", label: "Venue", type: "text", placeholder: "The Grand Ballroom" },
            { key: "clientName", label: "Client Name", type: "text", placeholder: "Sarah Johnson" },
            { key: "clientEmail", label: "Client Email", type: "email", placeholder: "sarah@example.com" },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onCreate({
                ...form,
                status: "planning" as const,
                floorPlanJSON: null,
                floorPlans: [
                  { id: "ceremony", name: "Ceremony", json: null, lightingZones: [] },
                  { id: "cocktail", name: "Cocktail Hour", json: null, lightingZones: [] },
                  { id: "reception", name: "Reception", json: null, lightingZones: [] },
                  { id: "dancefloor", name: "Dance Floor", json: null, lightingZones: [] },
                ],
                files: [],
                timeline: [],
                schedule: [],
                vendors: [],
                questionnaires: [],
                invoices: [],
                expenses: [],
                guests: [],
                colorPalette: [],
                moodBoard: [],
                discoveredVendors: [],
                contracts: [],
                budget: [],
                messages: [],
                archivedAt: null,
                shareToken: '',
              })
            }
            disabled={!form.name || !form.date}
            className="bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
