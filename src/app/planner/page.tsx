"use client";

import { useEvents, useStoreActions } from "@/hooks/useStore";
import { Plus, Calendar, MapPin, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const statusColors: Record<string, string> = {
  planning: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-stone-100 text-stone-500",
};

export default function PlannerDashboard() {
  const events = useEvents();
  const { createEvent } = useStoreActions();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-800">Events</h1>
          <p className="text-sm text-stone-400 mt-1">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-soft"
        >
          <Plus size={16} />
          New Event
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/planner/${event.id}`}
            className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft hover:shadow-card transition-all group"
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
              <ChevronRight
                size={14}
                className="group-hover:translate-x-1 transition-transform text-stone-300"
              />
            </div>
          </Link>
        ))}
        {events.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className="text-stone-300 text-sm">No events yet — create one to get started.</p>
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
                budget: [],
                messages: [],
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
