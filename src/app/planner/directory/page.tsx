"use client";

import { useEvents } from "@/hooks/useStore";
import { useState, useMemo } from "react";
import { Search, User, Store, Mail, Phone, Calendar } from "lucide-react";

type DirectoryEntry = {
  type: "client" | "vendor";
  name: string;
  email: string;
  phone: string;
  category?: string;
  contact?: string;
  notes?: string;
  events: { id: string; name: string; date: string }[];
};

export default function DirectoryPage() {
  const events = useEvents();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "clients" | "vendors">("all");

  const directory = useMemo(() => {
    const map = new Map<string, DirectoryEntry>();

    for (const event of events) {
      // Client entry — keyed by email (or name if no email)
      const clientKey = `client:${event.clientEmail || event.clientName}`;
      if (event.clientName) {
        const existing = map.get(clientKey);
        if (existing) {
          if (!existing.events.some((e) => e.id === event.id)) {
            existing.events.push({ id: event.id, name: event.name, date: event.date });
          }
        } else {
          map.set(clientKey, {
            type: "client",
            name: event.clientName,
            email: event.clientEmail,
            phone: "",
            events: [{ id: event.id, name: event.name, date: event.date }],
          });
        }
      }

      // Vendor entries — keyed by name+email
      for (const vendor of event.vendors ?? []) {
        const vendorKey = `vendor:${vendor.name}:${vendor.email}`;
        const existing = map.get(vendorKey);
        if (existing) {
          if (!existing.events.some((e) => e.id === event.id)) {
            existing.events.push({ id: event.id, name: event.name, date: event.date });
          }
        } else {
          map.set(vendorKey, {
            type: "vendor",
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            category: vendor.category,
            contact: vendor.contact,
            notes: vendor.notes,
            events: [{ id: event.id, name: event.name, date: event.date }],
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return directory.filter((entry) => {
      if (tab === "clients" && entry.type !== "client") return false;
      if (tab === "vendors" && entry.type !== "vendor") return false;
      if (!q) return true;
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.email.toLowerCase().includes(q) ||
        entry.phone.toLowerCase().includes(q) ||
        (entry.category ?? "").toLowerCase().includes(q) ||
        (entry.contact ?? "").toLowerCase().includes(q) ||
        entry.events.some((e) => e.name.toLowerCase().includes(q))
      );
    });
  }, [directory, search, tab]);

  const clientCount = directory.filter((e) => e.type === "client").length;
  const vendorCount = directory.filter((e) => e.type === "vendor").length;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-stone-800">Directory</h1>
        <p className="text-sm text-stone-400 mt-1">
          {clientCount} client{clientCount !== 1 ? "s" : ""} &middot; {vendorCount} vendor{vendorCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, event..."
            className="w-full border border-stone-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
        </div>
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 shrink-0">
          {([
            { key: "all", label: "All" },
            { key: "clients", label: "Clients" },
            { key: "vendors", label: "Vendors" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
          <p className="text-sm text-stone-400">
            {search ? "No results found." : "No contacts yet. Add clients and vendors to your events."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry, idx) => (
            <div
              key={`${entry.type}-${entry.name}-${idx}`}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  entry.type === "client" ? "bg-rose-50" : "bg-amber-50"
                }`}>
                  {entry.type === "client" ? (
                    <User size={16} className="text-rose-400" />
                  ) : (
                    <Store size={16} className="text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-stone-800">{entry.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      entry.type === "client"
                        ? "bg-rose-50 text-rose-500"
                        : "bg-amber-50 text-amber-600"
                    }`}>
                      {entry.type === "client" ? "Client" : entry.category ?? "Vendor"}
                    </span>
                  </div>

                  {entry.contact && (
                    <p className="text-xs text-stone-400 mt-0.5">Contact: {entry.contact}</p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    {entry.email && (
                      <span className="flex items-center gap-1 text-xs text-stone-500">
                        <Mail size={11} className="text-stone-400" />
                        {entry.email}
                      </span>
                    )}
                    {entry.phone && (
                      <span className="flex items-center gap-1 text-xs text-stone-500">
                        <Phone size={11} className="text-stone-400" />
                        {entry.phone}
                      </span>
                    )}
                  </div>

                  {entry.notes && (
                    <p className="text-xs text-stone-400 mt-1 italic">{entry.notes}</p>
                  )}

                  {/* Associated events */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {entry.events.map((evt) => (
                      <a
                        key={evt.id}
                        href={`/planner/${evt.id}`}
                        className="flex items-center gap-1 text-[11px] bg-stone-50 text-stone-500 hover:text-rose-500 hover:bg-rose-50 px-2 py-0.5 rounded-lg border border-stone-100 transition-colors"
                      >
                        <Calendar size={10} />
                        {evt.name}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
