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
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { Guest, RsvpStatus } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<Guest, "id">[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let current = "";
    let inQuotes = false;
    let row: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          current += '"';
          i++; // skip escaped quote
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          row.push(current.trim());
          current = "";
        } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
          row.push(current.trim());
          current = "";
          if (row.some((c) => c !== "")) rows.push(row);
          row = [];
          if (ch === "\r") i++; // skip \n after \r
        } else {
          current += ch;
        }
      }
    }
    // Last row
    row.push(current.trim());
    if (row.some((c) => c !== "")) rows.push(row);

    return rows;
  }

  function normalizeHeader(h: string): string {
    return h.toLowerCase().replace(/[^a-z]/g, "");
  }

  function handleCSVFile(file: File) {
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const rows = parseCSV(text);
      if (rows.length === 0) {
        setImportErrors(["The file appears to be empty."]);
        setImportPreview([]);
        return;
      }

      const errors: string[] = [];
      const parsed: Omit<Guest, "id">[] = [];

      // Detect headers — check if first row looks like headers
      const firstRow = rows[0].map(normalizeHeader);
      const knownHeaders = ["name", "email", "rsvp", "mealchoice", "meal", "table", "tableassignment", "plusone", "plusonename", "dietarynotes", "dietary", "notes", "firstname", "lastname", "first", "last", "fullname"];
      const hasHeaders = firstRow.some((h) => knownHeaders.includes(h));

      const headerMap: Record<string, number> = {};
      let dataRows = rows;

      if (hasHeaders) {
        dataRows = rows.slice(1);
        firstRow.forEach((h, i) => { headerMap[h] = i; });
      }

      // Helper to get cell value by possible header names
      function getCol(row: string[], ...names: string[]): string {
        if (hasHeaders) {
          for (const n of names) {
            const idx = headerMap[normalizeHeader(n)];
            if (idx !== undefined && row[idx]) return row[idx];
          }
          return "";
        }
        return "";
      }

      dataRows.forEach((row, rowIdx) => {
        let name = "";
        let email = "";
        let rsvp: RsvpStatus = "pending";
        let mealChoice = "";
        let tableAssignment = "";
        let plusOne = false;
        let plusOneName = "";
        let dietaryNotes = "";

        if (hasHeaders) {
          // Check for first/last name columns
          const firstName = getCol(row, "first name", "firstname", "first");
          const lastName = getCol(row, "last name", "lastname", "last");
          if (firstName || lastName) {
            name = [firstName, lastName].filter(Boolean).join(" ");
          } else {
            name = getCol(row, "name", "full name", "fullname", "guest name", "guestname", "guest");
          }
          email = getCol(row, "email", "email address", "emailaddress");
          const rsvpVal = getCol(row, "rsvp", "rsvp status", "status").toLowerCase();
          if (["accepted", "yes", "confirmed", "attending"].includes(rsvpVal)) rsvp = "accepted";
          else if (["declined", "no", "not attending"].includes(rsvpVal)) rsvp = "declined";
          mealChoice = getCol(row, "meal choice", "mealchoice", "meal", "entree", "dinner");
          tableAssignment = getCol(row, "table", "table assignment", "tableassignment", "table number", "tablenumber", "seating");
          const plusOneVal = getCol(row, "plus one", "plusone", "plus 1", "guest").toLowerCase();
          plusOne = ["yes", "true", "1", "y"].includes(plusOneVal);
          plusOneName = getCol(row, "plus one name", "plusonename", "plus 1 name", "guest name");
          dietaryNotes = getCol(row, "dietary notes", "dietarynotes", "dietary", "allergies", "restrictions", "notes", "dietary restrictions");
        } else {
          // No headers — assume column order: Name, Email (or just Name)
          name = row[0] || "";
          email = row[1] || "";
        }

        if (!name) {
          errors.push(`Row ${rowIdx + (hasHeaders ? 2 : 1)}: Missing name, skipped.`);
          return;
        }

        parsed.push({ name, email, rsvp, mealChoice, tableAssignment, plusOne, plusOneName, dietaryNotes });
      });

      if (parsed.length === 0) {
        errors.push("No valid guests found in file.");
      }

      setImportPreview(parsed);
      setImportErrors(errors);
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (importPreview.length === 0) return;
    const newGuests: Guest[] = importPreview.map((g) => ({
      id: crypto.randomUUID(),
      ...g,
    }));
    updateEvent(event!.id, { guests: [...guests, ...newGuests] });
    setShowImport(false);
    setImportPreview([]);
    setImportErrors([]);
    setImportFileName("");
  }

  function cancelImport() {
    setShowImport(false);
    setImportPreview([]);
    setImportErrors([]);
    setImportFileName("");
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
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 border border-stone-200 px-3 py-2 rounded-xl text-xs text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <Upload size={13} />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 border border-stone-200 px-3 py-2 rounded-xl text-xs text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export CSV</span>
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

      {/* Import CSV Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={cancelImport}>
          <div className="absolute inset-0 bg-stone-900/30" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <FileSpreadsheet size={16} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-sm font-heading font-semibold text-stone-800">Import Guests from CSV</h2>
                  <p className="text-[11px] text-stone-400">Upload a CSV file with guest names and details</p>
                </div>
              </div>
              <button onClick={cancelImport} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* File upload area */}
              {importPreview.length === 0 && (
                <>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-2xl p-10 cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-colors">
                    <Upload size={28} className="text-stone-300 mb-3" />
                    <p className="text-sm font-medium text-stone-600">Click to upload a CSV file</p>
                    <p className="text-xs text-stone-400 mt-1">or drag and drop</p>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCSVFile(file);
                      }}
                    />
                  </label>

                  <div className="mt-5 bg-stone-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-stone-600 mb-2">Supported formats:</p>
                    <ul className="text-xs text-stone-500 space-y-1.5">
                      <li className="flex items-start gap-1.5">
                        <Check size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span><strong>With headers:</strong> Name, Email, RSVP, Meal Choice, Table, Plus One, Dietary Notes</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span><strong>First/Last name:</strong> First Name, Last Name columns auto-merged</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span><strong>Simple list:</strong> Just names (one per row) — no headers needed</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span><strong>RSVP values:</strong> accepted/yes/confirmed, declined/no, pending (default)</span>
                      </li>
                    </ul>
                    <p className="text-[11px] text-stone-400 mt-3">Tip: Export your current list to see the exact format.</p>
                  </div>
                </>
              )}

              {/* Errors */}
              {importErrors.length > 0 && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle size={13} className="text-amber-500" />
                    <p className="text-xs font-medium text-amber-700">
                      {importErrors.length} warning{importErrors.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ul className="text-xs text-amber-600 space-y-0.5">
                    {importErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importErrors.length > 5 && (
                      <li>...and {importErrors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              {importPreview.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {importPreview.length} guest{importPreview.length !== 1 ? "s" : ""} ready to import
                      </p>
                      <p className="text-[11px] text-stone-400">from {importFileName}</p>
                    </div>
                    <button
                      onClick={() => { setImportPreview([]); setImportErrors([]); setImportFileName(""); }}
                      className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      Choose different file
                    </button>
                  </div>

                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-xs">
                        <thead className="bg-stone-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-stone-500">#</th>
                            <th className="text-left px-3 py-2 font-medium text-stone-500">Name</th>
                            <th className="text-left px-3 py-2 font-medium text-stone-500">Email</th>
                            <th className="text-left px-3 py-2 font-medium text-stone-500">RSVP</th>
                            <th className="text-left px-3 py-2 font-medium text-stone-500">Meal</th>
                            <th className="text-left px-3 py-2 font-medium text-stone-500">Table</th>
                            <th className="text-left px-3 py-2 font-medium text-stone-500">+1</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {importPreview.map((g, i) => (
                            <tr key={i} className="hover:bg-stone-50/50">
                              <td className="px-3 py-2 text-stone-400">{i + 1}</td>
                              <td className="px-3 py-2 text-stone-800 font-medium">{g.name}</td>
                              <td className="px-3 py-2 text-stone-500">{g.email || "—"}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${RSVP_COLORS[g.rsvp]}`}>
                                  {g.rsvp}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-stone-500">{g.mealChoice || "—"}</td>
                              <td className="px-3 py-2 text-stone-500">{g.tableAssignment || "—"}</td>
                              <td className="px-3 py-2 text-stone-500">{g.plusOne ? "Yes" : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            {importPreview.length > 0 && (
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-100 bg-stone-50/50">
                <button
                  onClick={cancelImport}
                  className="text-xs text-stone-400 hover:text-stone-600 px-4 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImport}
                  className="flex items-center gap-1.5 text-xs font-medium bg-emerald-500 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  <Check size={13} />
                  Import {importPreview.length} Guest{importPreview.length !== 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                    <button onClick={() => setConfirmDeleteId(guest.id)} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Guest?"
        message="This guest will be permanently removed from the guest list."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId) deleteGuest(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
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
