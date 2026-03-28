"use client";

import { useEvent, useStoreActions } from "@/hooks/useStore";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  ChevronDown,
  Download,
} from "lucide-react";
import { Guest, RsvpStatus } from "@/lib/types";

const RSVP_COLORS: Record<RsvpStatus, string> = {
  pending: "bg-amber-50 text-amber-600",
  accepted: "bg-emerald-50 text-emerald-600",
  declined: "bg-red-50 text-red-500",
};

const EMPTY_GUEST: Omit<Guest, "id"> = {
  name: "",
  email: "",
  rsvp: "pending",
  mealChoice: "",
  tableAssignment: "",
  plusOne: false,
  plusOneName: "",
  dietaryNotes: "",
};

export default function GuestsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const { updateEvent } = useStoreActions();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | RsvpStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_GUEST);

  if (!event) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Event not found.</p>
        <Link href="/planner" className="text-rose-500 hover:underline text-sm mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const guests = event.guests ?? [];

  const filtered = guests.filter((g) => {
    if (filter !== "all" && g.rsvp !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.tableAssignment.toLowerCase().includes(q) ||
        g.mealChoice.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const accepted = guests.filter((g) => g.rsvp === "accepted").length;
  const declined = guests.filter((g) => g.rsvp === "declined").length;
  const pending = guests.filter((g) => g.rsvp === "pending").length;
  const plusOnes = guests.filter((g) => g.plusOne).length;
  const totalAttending = accepted + plusOnes;

  function startAdd() {
    setForm(EMPTY_GUEST);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(g: Guest) {
    setForm({
      name: g.name,
      email: g.email,
      rsvp: g.rsvp,
      mealChoice: g.mealChoice,
      tableAssignment: g.tableAssignment,
      plusOne: g.plusOne,
      plusOneName: g.plusOneName,
      dietaryNotes: g.dietaryNotes,
    });
    setEditingId(g.id);
    setShowForm(false);
  }

  function save() {
    if (!form.name.trim()) return;
    if (editingId) {
      const updated = guests.map((g) =>
        g.id === editingId ? { ...g, ...form } : g
      );
      updateEvent(event!.id, { guests: updated });
      setEditingId(null);
    } else {
      const newGuest: Guest = { id: crypto.randomUUID(), ...form };
      updateEvent(event!.id, { guests: [...guests, newGuest] });
      setShowForm(false);
    }
    setForm(EMPTY_GUEST);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_GUEST);
  }

  function deleteGuest(id: string) {
    updateEvent(event!.id, { guests: guests.filter((g) => g.id !== id) });
    if (editingId === id) cancel();
  }

  function exportCSV() {
    const headers = ["Name", "Email", "RSVP", "Meal Choice", "Table", "Plus One", "Plus One Name", "Dietary Notes"];
    const rows = guests.map((g) => [
      g.name, g.email, g.rsvp, g.mealChoice, g.tableAssignment,
      g.plusOne ? "Yes" : "No", g.plusOneName, g.dietaryNotes,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event!.name} - Guest List.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/planner/${event.id}`}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
        <div className="w-px h-5 bg-stone-200" />
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-semibold text-stone-800 truncate">{event.name}</h1>
          <p className="text-xs text-stone-400">Guest List</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 border border-stone-200 px-3 py-2 rounded-xl text-xs text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors"
          >
            <Plus size={13} />
            Add Guest
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <p className="text-xs text-stone-400 mb-1">Total Guests</p>
          <p className="text-xl font-heading font-bold text-stone-800">{guests.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <p className="text-xs text-stone-400 mb-1">Accepted</p>
          <p className="text-xl font-heading font-bold text-emerald-600">{accepted}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <p className="text-xs text-stone-400 mb-1">Declined</p>
          <p className="text-xl font-heading font-bold text-red-500">{declined}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <p className="text-xs text-stone-400 mb-1">Pending</p>
          <p className="text-xl font-heading font-bold text-amber-600">{pending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft col-span-2 sm:col-span-1">
          <p className="text-xs text-stone-400 mb-1">Total Attending</p>
          <p className="text-xl font-heading font-bold text-stone-800">{totalAttending}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guests…"
            className="w-full border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "accepted", "pending", "declined"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-rose-50 text-rose-600"
                  : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Add / Edit Form */}
      {(showForm || editingId) && (
        <GuestForm
          form={form}
          onChange={setForm}
          onSave={save}
          onCancel={cancel}
          isEdit={!!editingId}
        />
      )}

      {/* Guest List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-soft">
          <Users size={24} className="text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-400">
            {guests.length === 0 ? "No guests added yet." : "No guests match your search."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_100px_80px] gap-3 px-5 py-3 bg-stone-50 border-b border-stone-100 text-xs font-medium text-stone-500 uppercase tracking-wider">
            <span>Guest</span>
            <span>RSVP</span>
            <span>Meal</span>
            <span>Table</span>
            <span></span>
          </div>
          <div className="divide-y divide-stone-100">
            {filtered.map((guest) =>
              editingId === guest.id ? null : (
                <div
                  key={guest.id}
                  className="group flex flex-col sm:grid sm:grid-cols-[1fr_100px_100px_100px_80px] gap-1 sm:gap-3 sm:items-center px-5 py-3.5 hover:bg-stone-50/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-800">{guest.name}</span>
                      {guest.plusOne && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">
                          +1{guest.plusOneName ? `: ${guest.plusOneName}` : ""}
                        </span>
                      )}
                    </div>
                    {guest.email && <p className="text-xs text-stone-400 truncate">{guest.email}</p>}
                    {guest.dietaryNotes && <p className="text-xs text-stone-400 italic mt-0.5">{guest.dietaryNotes}</p>}
                  </div>
                  <div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${RSVP_COLORS[guest.rsvp]}`}>
                      {guest.rsvp}
                    </span>
                  </div>
                  <span className="text-xs text-stone-500">{guest.mealChoice || "—"}</span>
                  <span className="text-xs text-stone-500">{guest.tableAssignment || "—"}</span>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(guest)} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteGuest(guest.id)} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GuestForm({
  form,
  onChange,
  onSave,
  onCancel,
  isEdit,
}: {
  form: Omit<Guest, "id">;
  onChange: (f: Omit<Guest, "id">) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-5">
      <h3 className="font-heading font-semibold text-stone-800 text-sm mb-4">
        {isEdit ? "Edit Guest" : "Add Guest"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-stone-500 mb-1">Name *</label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Guest name"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-stone-500 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            placeholder="guest@email.com"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">RSVP Status</label>
          <div className="relative">
            <select
              value={form.rsvp}
              onChange={(e) => onChange({ ...form, rsvp: e.target.value as RsvpStatus })}
              className="w-full appearance-none border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
            >
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Meal Choice</label>
          <input
            value={form.mealChoice}
            onChange={(e) => onChange({ ...form, mealChoice: e.target.value })}
            placeholder="e.g. Chicken, Fish, Vegetarian"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Table Assignment</label>
          <input
            value={form.tableAssignment}
            onChange={(e) => onChange({ ...form, tableAssignment: e.target.value })}
            placeholder="e.g. Table 1"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Dietary Notes</label>
          <input
            value={form.dietaryNotes}
            onChange={(e) => onChange({ ...form, dietaryNotes: e.target.value })}
            placeholder="Allergies, restrictions…"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
        </div>
        <div className="col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.plusOne}
              onChange={(e) => onChange({ ...form, plusOne: e.target.checked, plusOneName: e.target.checked ? form.plusOneName : "" })}
              className="rounded border-stone-300 text-rose-400 focus:ring-rose-400/30"
            />
            <span className="text-sm text-stone-600">Plus One</span>
          </label>
          {form.plusOne && (
            <input
              value={form.plusOneName}
              onChange={(e) => onChange({ ...form, plusOneName: e.target.value })}
              placeholder="Plus one name"
              className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          )}
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button
          onClick={onSave}
          disabled={!form.name.trim()}
          className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 disabled:opacity-50 transition-colors"
        >
          {isEdit ? "Save" : "Add Guest"}
        </button>
        <button onClick={onCancel} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
