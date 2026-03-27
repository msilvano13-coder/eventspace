"use client";

import { useEvent, useStoreActions, useQuestionnaires } from "@/hooks/useStore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Layout,
  FileText,
  CheckSquare,
  Share2,
  Calendar,
  MapPin,
  User,
  Mail,
  Check,
  Circle,
  Plus,
  Pencil,
  Trash2,
  X,
  Clock,
  Store,
  ChevronDown,
  Phone,
  ClipboardList,
  Receipt,
  Wallet,
} from "lucide-react";
import { TimelineItem, Vendor, VendorCategory, QuestionnaireAssignment, Expense } from "@/lib/types";

const STATUS_OPTIONS = ["planning", "confirmed", "completed"] as const;

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const { updateEvent, deleteEvent } = useStoreActions();
  const allQuestionnaires = useQuestionnaires();
  const router = useRouter();

  // ── Event info editing ──
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ name: "", date: "", venue: "", status: "planning" as string });

  // ── Client editing ──
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState({ clientName: "", clientEmail: "" });

  // ── Delete ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── To-Do state ──
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState("");
  const [editTodoDate, setEditTodoDate] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDate, setNewTodoDate] = useState("");
  const newTodoRef = useRef<HTMLInputElement>(null);
  const editTodoRef = useRef<HTMLInputElement>(null);

  // ── Vendor state ──
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [addingVendor, setAddingVendor] = useState(false);
  const [vendorForm, setVendorForm] = useState<Omit<Vendor, "id">>({
    name: "", category: "other", contact: "", phone: "", email: "", notes: "",
  });

  // ── Questionnaire assign state ──
  const [showAssignQ, setShowAssignQ] = useState(false);

  // ── Expense state ──
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "other", date: "", notes: "" });

  useEffect(() => { if (addingTodo) newTodoRef.current?.focus(); }, [addingTodo]);
  useEffect(() => { if (editingTodoId) editTodoRef.current?.focus(); }, [editingTodoId]);

  if (!event) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Event not found.</p>
        <Link href="/planner" className="text-rose-500 hover:underline text-sm mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const clientLink = `${typeof window !== "undefined" ? window.location.origin : ""}/client/${event.id}`;
  const sortedTodos = [...event.timeline].sort((a, b) => a.order - b.order);
  const vendors = event.vendors ?? [];

  // ── Info handlers ──
  function startEditInfo() {
    setInfoForm({ name: event!.name, date: event!.date, venue: event!.venue, status: event!.status });
    setEditingInfo(true);
  }
  function saveInfo() {
    if (!infoForm.name.trim() || !infoForm.date) { setEditingInfo(false); return; }
    updateEvent(event!.id, {
      name: infoForm.name.trim(),
      date: infoForm.date,
      venue: infoForm.venue.trim(),
      status: infoForm.status as "planning" | "confirmed" | "completed",
    });
    setEditingInfo(false);
  }

  // ── Client handlers ──
  function startEditClient() {
    setClientForm({ clientName: event!.clientName, clientEmail: event!.clientEmail });
    setEditingClient(true);
  }
  function saveClient() {
    updateEvent(event!.id, { clientName: clientForm.clientName.trim(), clientEmail: clientForm.clientEmail.trim() });
    setEditingClient(false);
  }

  // ── Delete handler ──
  function confirmDelete() {
    deleteEvent(event!.id);
    router.push("/planner");
  }

  // ── To-do handlers ──
  function toggleTodo(id: string) {
    const updated = event!.timeline.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    updateEvent(event!.id, { timeline: updated });
  }

  function startEditTodo(item: TimelineItem) {
    setEditingTodoId(item.id);
    setEditTodoTitle(item.title);
    setEditTodoDate(item.dueDate ?? "");
  }

  function saveEditTodo() {
    if (!editingTodoId || !editTodoTitle.trim()) { cancelEditTodo(); return; }
    const updated = event!.timeline.map((t) =>
      t.id === editingTodoId
        ? { ...t, title: editTodoTitle.trim(), dueDate: editTodoDate || null }
        : t
    );
    updateEvent(event!.id, { timeline: updated });
    cancelEditTodo();
  }

  function cancelEditTodo() {
    setEditingTodoId(null); setEditTodoTitle(""); setEditTodoDate("");
  }

  function deleteTodo(id: string) {
    updateEvent(event!.id, { timeline: event!.timeline.filter((t) => t.id !== id) });
    if (editingTodoId === id) cancelEditTodo();
  }

  function saveNewTodo() {
    if (!newTodoTitle.trim()) { cancelNewTodo(); return; }
    const item: TimelineItem = {
      id: crypto.randomUUID(),
      title: newTodoTitle.trim(),
      dueDate: newTodoDate || null,
      completed: false,
      order: event!.timeline.length,
    };
    updateEvent(event!.id, { timeline: [...event!.timeline, item] });
    setNewTodoTitle(""); setNewTodoDate("");
    newTodoRef.current?.focus();
  }

  function cancelNewTodo() {
    setAddingTodo(false); setNewTodoTitle(""); setNewTodoDate("");
  }

  // ── Vendor handlers ──
  function startAddVendor() {
    setVendorForm({ name: "", category: "other", contact: "", phone: "", email: "", notes: "" });
    setEditingVendorId(null);
    setAddingVendor(true);
  }

  function startEditVendor(v: Vendor) {
    setVendorForm({ name: v.name, category: v.category, contact: v.contact, phone: v.phone, email: v.email, notes: v.notes });
    setEditingVendorId(v.id);
    setAddingVendor(false);
  }

  function saveVendor() {
    if (!vendorForm.name.trim()) return;
    if (editingVendorId) {
      const updated = vendors.map((v) => v.id === editingVendorId ? { ...v, ...vendorForm } : v);
      updateEvent(event!.id, { vendors: updated });
      setEditingVendorId(null);
    } else {
      const newVendor: Vendor = { id: crypto.randomUUID(), ...vendorForm };
      updateEvent(event!.id, { vendors: [...vendors, newVendor] });
      setAddingVendor(false);
    }
    setVendorForm({ name: "", category: "other", contact: "", phone: "", email: "", notes: "" });
  }

  function cancelVendor() {
    setAddingVendor(false);
    setEditingVendorId(null);
    setVendorForm({ name: "", category: "other", contact: "", phone: "", email: "", notes: "" });
  }

  function deleteVendor(id: string) {
    updateEvent(event!.id, { vendors: vendors.filter((v) => v.id !== id) });
    if (editingVendorId === id) cancelVendor();
  }

  // ── Questionnaire handlers ──
  const assignedIds = new Set((event?.questionnaires ?? []).map((a) => a.questionnaireId));
  const availableQuestionnaires = allQuestionnaires.filter((q) => !assignedIds.has(q.id));

  function assignQuestionnaire(qId: string) {
    const q = allQuestionnaires.find((x) => x.id === qId);
    if (!q) return;
    const assignment: QuestionnaireAssignment = {
      questionnaireId: q.id,
      questionnaireName: q.name,
      answers: {},
      completedAt: null,
    };
    updateEvent(event!.id, { questionnaires: [...(event!.questionnaires ?? []), assignment] });
    setShowAssignQ(false);
  }

  function removeQuestionnaire(qId: string) {
    updateEvent(event!.id, { questionnaires: (event!.questionnaires ?? []).filter((a) => a.questionnaireId !== qId) });
  }

  // ── Expense handlers ──
  const expenses = event?.expenses ?? [];
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  function startAddExpense() {
    setExpenseForm({ description: "", amount: "", category: "other", date: new Date().toISOString().split("T")[0], notes: "" });
    setEditingExpenseId(null);
    setAddingExpense(true);
  }

  function startEditExpense(exp: Expense) {
    setExpenseForm({ description: exp.description, amount: String(exp.amount), category: exp.category, date: exp.date, notes: exp.notes });
    setEditingExpenseId(exp.id);
    setAddingExpense(false);
  }

  function saveExpense() {
    if (!expenseForm.description.trim() || !expenseForm.amount) return;
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) return;
    if (editingExpenseId) {
      const updated = expenses.map((e) => e.id === editingExpenseId ? { ...e, description: expenseForm.description.trim(), amount, category: expenseForm.category, date: expenseForm.date, notes: expenseForm.notes.trim() } : e);
      updateEvent(event!.id, { expenses: updated });
      setEditingExpenseId(null);
    } else {
      const newExp: Expense = { id: crypto.randomUUID(), description: expenseForm.description.trim(), amount, category: expenseForm.category, date: expenseForm.date, notes: expenseForm.notes.trim() };
      updateEvent(event!.id, { expenses: [...expenses, newExp] });
      setAddingExpense(false);
    }
    setExpenseForm({ description: "", amount: "", category: "other", date: "", notes: "" });
  }

  function cancelExpense() {
    setAddingExpense(false);
    setEditingExpenseId(null);
    setExpenseForm({ description: "", amount: "", category: "other", date: "", notes: "" });
  }

  function deleteExpense(id: string) {
    updateEvent(event!.id, { expenses: expenses.filter((e) => e.id !== id) });
    if (editingExpenseId === id) cancelExpense();
  }

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/planner"
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft size={14} />
          All Events
        </Link>
      </div>

      {/* ── Event Info ── */}
      {editingInfo ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Event Name</label>
              <input
                autoFocus
                value={infoForm.name}
                onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Date</label>
                <input
                  type="date"
                  value={infoForm.date}
                  onChange={(e) => setInfoForm({ ...infoForm, date: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Status</label>
                <div className="relative">
                  <select
                    value={infoForm.status}
                    onChange={(e) => setInfoForm({ ...infoForm, status: e.target.value })}
                    className="w-full appearance-none border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Venue</label>
              <input
                value={infoForm.venue}
                onChange={(e) => setInfoForm({ ...infoForm, venue: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={saveInfo} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 transition-colors">Save</button>
            <button onClick={() => setEditingInfo(false)} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold text-stone-800">{event.name}</h1>
              <button onClick={startEditInfo} className="p-1.5 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-lg transition-colors">
                <Pencil size={14} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-stone-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-stone-400" />
                {new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-stone-400" />
                {event.venue}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(clientLink)}
            className="flex items-center gap-2 border border-stone-200 px-3.5 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors shrink-0"
          >
            <Share2 size={14} />
            Copy Client Link
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <Link
          href={`/planner/${event.id}/floorplan`}
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
        >
          <Layout size={22} className="text-rose-400 mb-2" />
          <h3 className="font-heading font-semibold text-stone-800 group-hover:text-rose-500 text-sm">Floor Plan</h3>
          <p className="text-xs text-stone-400 mt-1">Design layout</p>
        </Link>
        <Link
          href={`/planner/${event.id}/files`}
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
        >
          <FileText size={22} className="text-blue-400 mb-2" />
          <h3 className="font-heading font-semibold text-stone-800 group-hover:text-blue-500 text-sm">Files</h3>
          <p className="text-xs text-stone-400 mt-1">{event.files.length} shared files</p>
        </Link>
        <Link
          href={`/planner/${event.id}/timeline`}
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
        >
          <Clock size={22} className="text-violet-400 mb-2" />
          <h3 className="font-heading font-semibold text-stone-800 group-hover:text-violet-500 text-sm">Timeline</h3>
          <p className="text-xs text-stone-400 mt-1">{(event.schedule ?? []).length} moments</p>
        </Link>
        <Link
          href={`/planner/${event.id}/invoices`}
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
        >
          <Receipt size={22} className="text-emerald-400 mb-2" />
          <h3 className="font-heading font-semibold text-stone-800 group-hover:text-emerald-500 text-sm">Invoices</h3>
          <p className="text-xs text-stone-400 mt-1">{(event.invoices ?? []).length} invoices</p>
        </Link>
      </div>

      {/* ── Client Details ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-stone-800">Client Details</h2>
          {!editingClient && (
            <button onClick={startEditClient} className="p-1.5 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-lg transition-colors">
              <Pencil size={14} />
            </button>
          )}
        </div>
        {editingClient ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Name</label>
              <input
                autoFocus
                value={clientForm.clientName}
                onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Email</label>
              <input
                type="email"
                value={clientForm.clientEmail}
                onChange={(e) => setClientForm({ ...clientForm, clientEmail: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={saveClient} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 transition-colors">Save</button>
              <button onClick={() => setEditingClient(false)} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2.5 text-stone-600">
              <User size={14} className="text-stone-400" />
              {event.clientName}
            </div>
            <div className="flex items-center gap-2.5 text-stone-600">
              <Mail size={14} className="text-stone-400" />
              {event.clientEmail}
            </div>
          </div>
        )}
      </div>

      {/* ── To Do List ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-emerald-400" />
            <h2 className="font-heading font-semibold text-stone-800">To Do List</h2>
          </div>
          {!addingTodo && (
            <button
              onClick={() => setAddingTodo(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Add task
            </button>
          )}
        </div>

        {sortedTodos.length === 0 && !addingTodo ? (
          <p className="text-sm text-stone-400">No tasks yet.</p>
        ) : (
          <div className="space-y-0.5">
            {sortedTodos.map((item) =>
              editingTodoId === item.id ? (
                <div key={item.id} className="flex flex-col gap-2 py-2.5 px-3 bg-stone-50 rounded-xl border border-stone-200">
                  <input
                    ref={editTodoRef}
                    value={editTodoTitle}
                    onChange={(e) => setEditTodoTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEditTodo(); if (e.key === "Escape") cancelEditTodo(); }}
                    placeholder="Task title"
                    className="text-sm text-stone-800 bg-transparent outline-none placeholder:text-stone-400 w-full"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={editTodoDate}
                      onChange={(e) => setEditTodoDate(e.target.value)}
                      className="text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-2 py-1 outline-none focus:border-rose-300"
                    />
                    <div className="flex-1" />
                    <button onClick={saveEditTodo} className="text-xs font-medium bg-rose-400 text-white px-3 py-1 rounded-lg hover:bg-rose-500 transition-colors">Save</button>
                    <button onClick={cancelEditTodo} className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="group flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <button onClick={() => toggleTodo(item.id)} className="shrink-0 transition-transform active:scale-90">
                    {item.completed ? (
                      <Check size={16} className="text-emerald-500" />
                    ) : (
                      <Circle size={16} className="text-stone-300" />
                    )}
                  </button>
                  <span
                    className={`text-sm flex-1 cursor-pointer ${item.completed ? "line-through text-stone-400" : "text-stone-700"}`}
                    onClick={() => toggleTodo(item.id)}
                  >
                    {item.title}
                  </span>
                  {item.dueDate && (
                    <span className="text-xs text-stone-400 shrink-0">
                      {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => startEditTodo(item)} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteTodo(item.id)} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            )}

            {addingTodo && (
              <div className="flex flex-col gap-2 py-2.5 px-3 bg-rose-50/60 rounded-xl border border-rose-100 mt-1">
                <input
                  ref={newTodoRef}
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNewTodo(); if (e.key === "Escape") cancelNewTodo(); }}
                  placeholder="New task…"
                  className="text-sm text-stone-800 bg-transparent outline-none placeholder:text-stone-400 w-full"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newTodoDate}
                    onChange={(e) => setNewTodoDate(e.target.value)}
                    className="text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-2 py-1 outline-none focus:border-rose-300"
                  />
                  <div className="flex-1" />
                  <button onClick={saveNewTodo} className="text-xs font-medium bg-rose-400 text-white px-3 py-1 rounded-lg hover:bg-rose-500 transition-colors">Add</button>
                  <button onClick={cancelNewTodo} className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"><X size={14} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Questionnaires ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-indigo-400" />
            <h2 className="font-heading font-semibold text-stone-800">Questionnaires</h2>
          </div>
          {!showAssignQ && (
            <button
              onClick={() => setShowAssignQ(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Assign
            </button>
          )}
        </div>

        {showAssignQ && (
          <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 mb-3">
            {availableQuestionnaires.length === 0 ? (
              <div className="text-center py-2">
                <p className="text-sm text-stone-400 mb-2">No questionnaires available.</p>
                <Link
                  href="/planner/questionnaires"
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                >
                  Create one first
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-stone-500 mb-2">Select a questionnaire to assign:</p>
                {availableQuestionnaires.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => assignQuestionnaire(q.id)}
                    className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white border border-transparent hover:border-stone-200 transition-all"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-700">{q.name}</p>
                      <p className="text-xs text-stone-400">{q.questions.length} question{q.questions.length !== 1 ? "s" : ""}</p>
                    </div>
                    <Plus size={14} className="text-stone-300" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-3">
              <button onClick={() => setShowAssignQ(false)} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {(event.questionnaires ?? []).length === 0 && !showAssignQ ? (
          <p className="text-sm text-stone-400">No questionnaires assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {(event.questionnaires ?? []).map((assignment) => {
              const totalQuestions = allQuestionnaires.find((q) => q.id === assignment.questionnaireId)?.questions.length ?? 0;
              const answeredCount = Object.keys(assignment.answers).length;
              const isComplete = assignment.completedAt !== null;
              return (
                <div key={assignment.questionnaireId} className="group flex items-center justify-between py-3 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-800">{assignment.questionnaireName}</span>
                      {isComplete ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Completed</span>
                      ) : answeredCount > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">In Progress</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">Not Started</span>
                      )}
                    </div>
                    {totalQuestions > 0 && (
                      <p className="text-xs text-stone-400 mt-0.5">{answeredCount}/{totalQuestions} answered</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => removeQuestionnaire(assignment.questionnaireId)}
                      className="p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Vendor List ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-amber-400" />
            <h2 className="font-heading font-semibold text-stone-800">Vendors</h2>
          </div>
          {!addingVendor && !editingVendorId && (
            <button
              onClick={startAddVendor}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Add vendor
            </button>
          )}
        </div>

        {(addingVendor || editingVendorId) && (
          <VendorForm
            form={vendorForm}
            onChange={setVendorForm}
            onSave={saveVendor}
            onCancel={cancelVendor}
            isEdit={!!editingVendorId}
          />
        )}

        {vendors.length === 0 && !addingVendor ? (
          <p className="text-sm text-stone-400">No vendors added yet.</p>
        ) : (
          <div className="space-y-2 mt-1">
            {vendors.map((vendor) =>
              editingVendorId === vendor.id ? null : (
                <VendorRow
                  key={vendor.id}
                  vendor={vendor}
                  onEdit={() => startEditVendor(vendor)}
                  onDelete={() => deleteVendor(vendor.id)}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* ── Expenses ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-teal-400" />
            <h2 className="font-heading font-semibold text-stone-800">Expenses</h2>
            {expenses.length > 0 && (
              <span className="text-xs text-stone-400 ml-1">({fmt(totalExpenses)})</span>
            )}
          </div>
          {!addingExpense && !editingExpenseId && (
            <button
              onClick={startAddExpense}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Add expense
            </button>
          )}
        </div>

        {(addingExpense || editingExpenseId) && (
          <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-stone-500 mb-1">Description *</label>
                <input
                  autoFocus
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g. Venue deposit"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-stone-500 mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-stone-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
                <div className="relative">
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full appearance-none border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                  >
                    {["venue", "catering", "photography", "flowers", "music", "decor", "rentals", "staffing", "transport", "other"].map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
                <input
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="Additional details…"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={saveExpense} disabled={!expenseForm.description.trim() || !expenseForm.amount} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 disabled:opacity-50 transition-colors">
                {editingExpenseId ? "Save" : "Add Expense"}
              </button>
              <button onClick={cancelExpense} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {expenses.length === 0 && !addingExpense ? (
          <p className="text-sm text-stone-400">No expenses tracked yet.</p>
        ) : (
          <div className="space-y-1">
            {expenses.map((exp) =>
              editingExpenseId === exp.id ? null : (
                <div key={exp.id} className="group flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-800">{exp.description}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium">{exp.category}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {exp.date && (
                        <span className="text-xs text-stone-400">
                          {new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                      {exp.notes && <span className="text-xs text-stone-400 italic">{exp.notes}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-stone-700 shrink-0">{fmt(exp.amount)}</span>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => startEditExpense(exp)} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteExpense(exp.id)} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Delete Event ── */}
      <div className="flex justify-center pb-8">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
        >
          <Trash2 size={13} />
          Delete Event
        </button>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteConfirm(false)}
        >
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-xl">
            <h2 className="text-base font-heading font-semibold text-stone-800 mb-2">Delete Event?</h2>
            <p className="text-sm text-stone-500 mb-6">
              <span className="font-medium text-stone-700">{event.name}</span> and all its data will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vendor Form ──
function VendorForm({
  form,
  onChange,
  onSave,
  onCancel,
  isEdit,
}: {
  form: Omit<Vendor, "id">;
  onChange: (f: Omit<Vendor, "id">) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 mb-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-stone-500 mb-1">Vendor Name *</label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="e.g. Golden Hour Photography"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
          <div className="relative">
            <select
              value={form.category}
              onChange={(e) => onChange({ ...form, category: e.target.value as VendorCategory })}
              className="w-full appearance-none border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
            >
              {(["catering", "photography", "videography", "music", "flowers", "cake", "venue", "hair & makeup", "transport", "officiant", "other"] as VendorCategory[]).map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Contact Name</label>
          <input
            value={form.contact}
            onChange={(e) => onChange({ ...form, contact: e.target.value })}
            placeholder="Contact person"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => onChange({ ...form, phone: e.target.value })}
            placeholder="555-0100"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-500 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            placeholder="vendor@email.com"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
          <input
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            placeholder="Package details, special instructions…"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onSave} disabled={!form.name.trim()} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 disabled:opacity-50 transition-colors">
          {isEdit ? "Save" : "Add Vendor"}
        </button>
        <button onClick={onCancel} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ── Vendor Row ──
const CATEGORY_COLORS: Record<string, string> = {
  catering: "bg-orange-50 text-orange-600",
  photography: "bg-violet-50 text-violet-600",
  videography: "bg-purple-50 text-purple-600",
  music: "bg-blue-50 text-blue-600",
  flowers: "bg-green-50 text-green-600",
  cake: "bg-pink-50 text-pink-600",
  venue: "bg-stone-100 text-stone-600",
  "hair & makeup": "bg-rose-50 text-rose-600",
  transport: "bg-sky-50 text-sky-600",
  officiant: "bg-amber-50 text-amber-600",
  other: "bg-stone-100 text-stone-500",
};

function VendorRow({ vendor, onEdit, onDelete }: { vendor: Vendor; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="group flex items-start gap-3 py-3 px-3 rounded-xl hover:bg-stone-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-stone-800">{vendor.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[vendor.category] ?? "bg-stone-100 text-stone-500"}`}>
            {vendor.category}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
          {vendor.contact && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <User size={11} />
              {vendor.contact}
            </span>
          )}
          {vendor.phone && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Phone size={11} />
              {vendor.phone}
            </span>
          )}
          {vendor.email && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Mail size={11} />
              {vendor.email}
            </span>
          )}
        </div>
        {vendor.notes && <p className="text-xs text-stone-400 mt-1 italic">{vendor.notes}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
