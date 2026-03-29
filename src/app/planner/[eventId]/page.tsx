"use client";

import { useEvent, useEventSubEntities, useStoreActions, useQuestionnaires, usePlannerProfile, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
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

  ClipboardList,
  Receipt,
  Wallet,
  Palette,
  Users,
  ChevronRight,
  Download,
  Image,
  Archive,
  RotateCcw,
} from "lucide-react";
import { TimelineItem, QuestionnaireAssignment, Expense, Message, BudgetItem, BUDGET_CATEGORIES, VENDOR_TO_BUDGET_CATEGORY } from "@/lib/types";
import MessageThread from "@/components/event/MessageThread";
import { exportEventPDF } from "@/lib/export-pdf";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const STATUS_OPTIONS = ["planning", "confirmed", "completed"] as const;

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["timeline", "schedule", "vendors", "guests", "invoices", "expenses", "budget"]);
  const { updateEvent, deleteEvent } = useStoreActions();
  const allQuestionnaires = useQuestionnaires();
  const plannerProfile = usePlannerProfile();
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

  // ── Questionnaire assign state ──
  const [showAssignQ, setShowAssignQ] = useState(false);

  // ── Expense state ──
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "other", date: "", notes: "" });

  // ── Budget state ──
  const [addingBudget, setAddingBudget] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetForm, setBudgetForm] = useState({ category: "Venue", allocated: "", notes: "" });

  // ── Color palette state ──
  const [addingColor, setAddingColor] = useState(false);
  const [newColor, setNewColor] = useState("#d4a5a5");

  // ── Confirm delete state ──
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; label: string } | null>(null);

  useEffect(() => { if (addingTodo) newTodoRef.current?.focus(); }, [addingTodo]);
  useEffect(() => { if (editingTodoId) editTodoRef.current?.focus(); }, [editingTodoId]);

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;

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

  // ── Budget handlers ──
  const budgetItems = event?.budget ?? [];
  const totalAllocated = budgetItems.reduce((sum, b) => sum + b.allocated, 0);

  // Derive committed/paid per budget category from vendor contracts
  function getCommittedForCategory(budgetCategory: string): number {
    return vendors
      .filter((v) => VENDOR_TO_BUDGET_CATEGORY[v.category] === budgetCategory)
      .reduce((sum, v) => sum + (v.contractTotal ?? 0), 0);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function getPaidForCategory(budgetCategory: string): number {
    return vendors
      .filter((v) => VENDOR_TO_BUDGET_CATEGORY[v.category] === budgetCategory)
      .reduce((sum, v) => sum + (v.payments ?? []).filter((p) => p.paid).reduce((s, p) => s + p.amount, 0), 0);
  }
  const totalCommitted = vendors.reduce((s, v) => s + (v.contractTotal ?? 0), 0);
  const totalPaid = vendors.reduce((s, v) => s + (v.payments ?? []).filter((p) => p.paid).reduce((ps, p) => ps + p.amount, 0), 0);
  const totalRemaining = totalAllocated - totalCommitted;

  function startAddBudget() {
    const usedCategories = budgetItems.map((b) => b.category);
    const nextCategory = BUDGET_CATEGORIES.find((c) => !usedCategories.includes(c)) || "Other";
    setBudgetForm({ category: nextCategory, allocated: "", notes: "" });
    setEditingBudgetId(null);
    setAddingBudget(true);
  }

  function startEditBudget(item: BudgetItem) {
    setBudgetForm({ category: item.category, allocated: String(item.allocated), notes: item.notes });
    setEditingBudgetId(item.id);
    setAddingBudget(false);
  }

  function saveBudget() {
    if (!budgetForm.category || !budgetForm.allocated) return;
    const allocated = parseFloat(budgetForm.allocated);
    if (isNaN(allocated) || allocated < 0) return;
    if (editingBudgetId) {
      const updated = budgetItems.map((b) => b.id === editingBudgetId ? { ...b, category: budgetForm.category, allocated, notes: budgetForm.notes.trim() } : b);
      updateEvent(event!.id, { budget: updated });
      setEditingBudgetId(null);
    } else {
      const newItem: BudgetItem = { id: crypto.randomUUID(), category: budgetForm.category, allocated, notes: budgetForm.notes.trim() };
      updateEvent(event!.id, { budget: [...budgetItems, newItem] });
      setAddingBudget(false);
    }
    setBudgetForm({ category: "Venue", allocated: "", notes: "" });
  }

  function cancelBudget() {
    setAddingBudget(false);
    setEditingBudgetId(null);
    setBudgetForm({ category: "Venue", allocated: "", notes: "" });
  }

  function deleteBudget(id: string) {
    updateEvent(event!.id, { budget: budgetItems.filter((b) => b.id !== id) });
    if (editingBudgetId === id) cancelBudget();
  }

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

      {/* ── Archived Banner ── */}
      {event.archivedAt && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive size={14} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-700">This event is archived</span>
            <span className="text-xs text-amber-500 ml-1">
              ({new Date(event.archivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
            </span>
          </div>
          <button
            onClick={() => updateEvent(event.id, { archivedAt: null })}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <RotateCcw size={12} />
            Restore
          </button>
        </div>
      )}

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
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => exportEventPDF(event, plannerProfile.businessName || plannerProfile.plannerName)}
              className="flex items-center gap-2 border border-stone-200 px-3.5 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(clientLink)}
              className="flex items-center gap-2 border border-stone-200 px-3.5 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Client Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
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
        <Link
          href={`/planner/${event.id}/guests`}
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
        >
          <Users size={22} className="text-amber-400 mb-2" />
          <h3 className="font-heading font-semibold text-stone-800 group-hover:text-amber-500 text-sm">Guests</h3>
          <p className="text-xs text-stone-400 mt-1">{(event.guests ?? []).length} guests</p>
        </Link>
        <Link
          href={`/planner/${event.id}/moodboard`}
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
        >
          <Image size={22} className="text-pink-400 mb-2" />
          <h3 className="font-heading font-semibold text-stone-800 group-hover:text-pink-500 text-sm">Mood Board</h3>
          <p className="text-xs text-stone-400 mt-1">{(event.moodBoard ?? []).length} images</p>
        </Link>
        <Link
          href={`/planner/${event.id}/vendors`}
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
        >
          <Store size={22} className="text-orange-400 mb-2" />
          <h3 className="font-heading font-semibold text-stone-800 group-hover:text-orange-500 text-sm">Vendors</h3>
          <p className="text-xs text-stone-400 mt-1">{(event.vendors ?? []).length} vendors</p>
        </Link>
        <Link
          href={`/planner/${event.id}/contracts`}
          className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
        >
          <FileText size={22} className="text-teal-400 mb-2" />
          <h3 className="font-heading font-semibold text-stone-800 group-hover:text-teal-500 text-sm">Contracts</h3>
          <p className="text-xs text-stone-400 mt-1">{(event.contracts ?? []).length} contracts</p>
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

      {/* ── Color Palette + To Do (2-col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-rose-400" />
            <h2 className="font-heading font-semibold text-stone-800">Color Palette</h2>
          </div>
          {!addingColor && (
            <button
              onClick={() => setAddingColor(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Add color
            </button>
          )}
        </div>

        {(event.colorPalette ?? []).length === 0 && !addingColor ? (
          <p className="text-sm text-stone-400">No colors added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5 items-center">
            {(event.colorPalette ?? []).map((color, i) => (
              <div key={i} className="group relative">
                <button
                  className="w-10 h-10 rounded-xl border-2 border-white shadow-sm ring-1 ring-stone-200 transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                  title={color}
                />
                <button
                  onClick={() => {
                    const updated = (event.colorPalette ?? []).filter((_, idx) => idx !== i);
                    updateEvent(event.id, { colorPalette: updated });
                  }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-stone-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={8} className="text-stone-400" />
                </button>
                <p className="text-[9px] text-stone-400 text-center mt-1 font-mono">{color}</p>
              </div>
            ))}
          </div>
        )}

        {addingColor && (
          <div className="flex items-center gap-3 mt-3 bg-stone-50 rounded-xl border border-stone-200 p-3">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer bg-transparent p-0.5"
            />
            <div className="flex-1">
              <input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="#000000"
                className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
              />
            </div>
            <button
              onClick={() => {
                if (newColor) {
                  updateEvent(event.id, { colorPalette: [...(event.colorPalette ?? []), newColor] });
                  setNewColor("#d4a5a5");
                  setAddingColor(false);
                }
              }}
              className="text-xs font-medium bg-rose-400 text-white px-3 py-1.5 rounded-lg hover:bg-rose-500 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setAddingColor(false); setNewColor("#d4a5a5"); }}
              className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* To Do List */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
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
                    <button onClick={() => setConfirmAction({ type: "todo", id: item.id, label: item.title })} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
      </div>{/* end 2-col grid */}

      {/* ── Questionnaires & Vendors (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

      {/* ── Questionnaires ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
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
                      onClick={() => setConfirmAction({ type: "questionnaire", id: assignment.questionnaireId, label: assignment.questionnaireName })}
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

      {/* ── Vendors (summary + link) ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-amber-400" />
            <h2 className="font-heading font-semibold text-stone-800">Vendors</h2>
            {vendors.length > 0 && <span className="text-xs text-stone-400">({vendors.length})</span>}
          </div>
          <Link
            href={`/planner/${event.id}/vendors`}
            className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            Manage <ChevronRight size={12} />
          </Link>
        </div>
        {vendors.length === 0 ? (
          <p className="text-sm text-stone-400">No vendors added yet.</p>
        ) : (
          <div className="space-y-1.5">
            {vendors.slice(0, 5).map((vendor) => (
              <div key={vendor.id} className="flex items-center gap-2 py-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[vendor.category] ?? "bg-stone-100 text-stone-500"}`}>{vendor.category}</span>
                <span className="text-sm text-stone-800 truncate">{vendor.name}</span>
                {vendor.contractTotal > 0 && <span className="text-xs text-stone-400 ml-auto shrink-0">{vendor.contractTotal.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}</span>}
              </div>
            ))}
            {vendors.length > 5 && <p className="text-xs text-stone-400">+{vendors.length - 5} more</p>}
          </div>
        )}
      </div>

      </div>{/* end Questionnaires & Vendors grid */}

      {/* ── Budget ── */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Wallet size={15} className="text-emerald-500" />
            <h2 className="font-heading font-semibold text-stone-800">Client Budget</h2>
            {budgetItems.length > 0 && (
              <span className="text-xs text-stone-400 ml-1">({fmt(totalAllocated)})</span>
            )}
          </div>
          {!addingBudget && !editingBudgetId && (
            <button onClick={startAddBudget} className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600">
              <Plus size={13} /> Add
            </button>
          )}
        </div>

        {/* Summary cards */}
        {budgetItems.length > 0 && (
          <div className="grid grid-cols-4 gap-3 px-5 py-4 border-b border-stone-100 bg-stone-50/50">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Budget</p>
              <p className="text-sm font-heading font-bold text-stone-800 mt-0.5">{fmt(totalAllocated)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Committed</p>
              <p className="text-sm font-heading font-bold text-stone-800 mt-0.5">{fmt(totalCommitted)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Paid</p>
              <p className="text-sm font-heading font-bold text-emerald-600 mt-0.5">{fmt(totalPaid)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Remaining</p>
              <p className={`text-sm font-heading font-bold mt-0.5 ${totalRemaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(totalRemaining)}</p>
            </div>
          </div>
        )}

        {/* Add/Edit form */}
        {(addingBudget || editingBudgetId) && (
          <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
                <select
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                >
                  {BUDGET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Allocated ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetForm.allocated}
                  onChange={(e) => setBudgetForm({ ...budgetForm, allocated: e.target.value })}
                  placeholder="5000"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
                <input
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={saveBudget} disabled={!budgetForm.category || !budgetForm.allocated} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 disabled:opacity-50 transition-colors">
                {editingBudgetId ? "Update" : "Add"}
              </button>
              <button onClick={cancelBudget} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2">Cancel</button>
            </div>
          </div>
        )}

        {/* Budget items */}
        {budgetItems.length === 0 && !addingBudget ? (
          <div className="px-5 py-8 text-center">
            <Wallet size={20} className="text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No budget items yet.</p>
            <p className="text-xs text-stone-300 mt-1">Break down the client&apos;s total budget by category.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {budgetItems.map((item) => {
              const committed = getCommittedForCategory(item.category);
              const pct = item.allocated > 0 ? Math.min((committed / item.allocated) * 100, 100) : 0;
              const over = committed > item.allocated;
              // Find matching vendors for this budget category
              const matchingVendors = vendors.filter((v) => VENDOR_TO_BUDGET_CATEGORY[v.category] === item.category && v.contractTotal > 0);
              return (
                <div
                  key={item.id}
                  className={`px-5 py-3.5 hover:bg-stone-50/50 transition-colors cursor-pointer ${editingBudgetId === item.id ? "bg-rose-50/30" : ""}`}
                  onClick={() => { if (!addingBudget && !editingBudgetId) startEditBudget(item); }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-stone-700">{item.category}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-stone-400">{fmt(committed)} / {fmt(item.allocated)}</span>
                      <span className={`font-semibold ${over ? "text-red-500" : "text-emerald-600"}`}>
                        {over ? `-${fmt(committed - item.allocated)} over` : fmt(item.allocated - committed) + " left"}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? "bg-red-400" : pct > 80 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  {/* Vendor breakdown */}
                  {matchingVendors.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {matchingVendors.map((v) => {
                        const vPaid = (v.payments ?? []).filter((p) => p.paid).reduce((s, p) => s + p.amount, 0);
                        return (
                          <div key={v.id} className="flex items-center justify-between text-[10px]">
                            <span className="text-stone-400">{v.name}</span>
                            <span className="text-stone-400">
                              {fmt(vPaid)} paid of {fmt(v.contractTotal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {committed === 0 && <p className="text-[10px] text-stone-300 mt-1 italic">No vendors assigned — add a vendor in this category to track spend</p>}
                  {item.notes && <p className="text-[10px] text-stone-400 mt-1">{item.notes}</p>}
                  {editingBudgetId === item.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "budget", id: item.id, label: item.category }); }}
                      className="text-[10px] text-red-400 hover:text-red-600 mt-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <MessageThread
        messages={event.messages ?? []}
        senderRole="planner"
        senderName="Planner"
        onSend={(msgs: Message[]) => updateEvent(eventId, { messages: msgs })}
      />

      {/* ── Expenses ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6 mt-6">
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
                    <button onClick={() => setConfirmAction({ type: "expense", id: exp.id, label: exp.description })} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Archive / Danger Zone ── */}
      <div className="mt-20 pt-8 border-t-2 border-dashed border-stone-200 pb-12">
        <div className="flex flex-col items-center gap-3">
          {event.archivedAt ? (
            <button
              onClick={() => { updateEvent(event.id, { archivedAt: null }); }}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 px-4 py-2.5 rounded-lg transition-colors"
            >
              <RotateCcw size={13} />
              Restore Event
            </button>
          ) : (
            <button
              onClick={() => { updateEvent(event.id, { archivedAt: new Date().toISOString() }); router.push("/planner"); }}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 px-4 py-2.5 rounded-lg transition-colors"
            >
              <Archive size={13} />
              Archive Event
            </button>
          )}
          <p className="text-center text-[11px] text-stone-300 uppercase tracking-widest font-medium mt-4 mb-2">Danger Zone</p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Delete Event Permanently
          </button>
        </div>
      </div>

      {/* ── Generic Confirm Dialog ── */}
      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.type === "todo" ? "Delete To-Do?" :
          confirmAction?.type === "questionnaire" ? "Remove Questionnaire?" :
          confirmAction?.type === "budget" ? "Remove Budget Item?" :
          confirmAction?.type === "expense" ? "Delete Expense?" : "Delete?"
        }
        message={
          confirmAction?.type === "todo" ? `"${confirmAction.label}" will be permanently removed.` :
          confirmAction?.type === "questionnaire" ? `"${confirmAction?.label}" will be unassigned from this event. Responses will be lost.` :
          confirmAction?.type === "budget" ? `The ${confirmAction?.label} budget category will be removed.` :
          confirmAction?.type === "expense" ? `"${confirmAction?.label}" will be permanently deleted.` : "This action cannot be undone."
        }
        confirmLabel={confirmAction?.type === "questionnaire" ? "Remove" : "Delete"}
        onConfirm={() => {
          if (confirmAction) {
            if (confirmAction.type === "todo") deleteTodo(confirmAction.id);
            else if (confirmAction.type === "questionnaire") removeQuestionnaire(confirmAction.id);
            else if (confirmAction.type === "budget") deleteBudget(confirmAction.id);
            else if (confirmAction.type === "expense") deleteExpense(confirmAction.id);
          }
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Event?"
        message={`${event.name} and all its data will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

// ── Vendor Category Colors ──
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
