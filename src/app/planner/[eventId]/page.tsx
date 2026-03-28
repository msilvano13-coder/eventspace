"use client";

import { useEvent, useStoreActions, useQuestionnaires, usePlannerProfile } from "@/hooks/useStore";
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
  Palette,
  Users,
  ChevronRight,
  Download,
  Image,
} from "lucide-react";
import { TimelineItem, Vendor, VendorCategory, QuestionnaireAssignment, Expense, Message, BudgetItem, BUDGET_CATEGORIES, VendorPaymentItem, VENDOR_TO_BUDGET_CATEGORY } from "@/lib/types";
import MessageThread from "@/components/event/MessageThread";
import { exportEventPDF } from "@/lib/export-pdf";

const STATUS_OPTIONS = ["planning", "confirmed", "completed"] as const;

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
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

  // ── Vendor state ──
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [addingVendor, setAddingVendor] = useState(false);
  const [vendorForm, setVendorForm] = useState<Omit<Vendor, "id">>({
    name: "", category: "other", contact: "", phone: "", email: "", notes: "", mealChoice: "", contractTotal: 0, payments: [],
  });

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

  // ── Vendor Payments state ──
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [addingPaymentForVendor, setAddingPaymentForVendor] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ description: "", amount: "", dueDate: "" });

  // ── Color palette state ──
  const [addingColor, setAddingColor] = useState(false);
  const [newColor, setNewColor] = useState("#d4a5a5");

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
    setVendorForm({ name: "", category: "other", contact: "", phone: "", email: "", notes: "", mealChoice: "", contractTotal: 0, payments: [] });
    setEditingVendorId(null);
    setAddingVendor(true);
  }

  function startEditVendor(v: Vendor) {
    setVendorForm({ name: v.name, category: v.category, contact: v.contact, phone: v.phone, email: v.email, notes: v.notes, mealChoice: v.mealChoice ?? "", contractTotal: v.contractTotal ?? 0, payments: v.payments ?? [] });
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
    setVendorForm({ name: "", category: "other", contact: "", phone: "", email: "", notes: "", mealChoice: "", contractTotal: 0, payments: [] });
  }

  function cancelVendor() {
    setAddingVendor(false);
    setEditingVendorId(null);
    setVendorForm({ name: "", category: "other", contact: "", phone: "", email: "", notes: "", mealChoice: "", contractTotal: 0, payments: [] });
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

  // ── Vendor Payment handlers ──
  function addPaymentToVendor(vendorId: string) {
    if (!paymentForm.description.trim() || !paymentForm.amount) return;
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount < 0) return;
    const newPayment: VendorPaymentItem = { id: crypto.randomUUID(), description: paymentForm.description.trim(), amount, dueDate: paymentForm.dueDate, paid: false, paidDate: null };
    const updated = vendors.map((v) => v.id === vendorId ? { ...v, payments: [...(v.payments ?? []), newPayment] } : v);
    updateEvent(event!.id, { vendors: updated });
    setPaymentForm({ description: "", amount: "", dueDate: "" });
    setAddingPaymentForVendor(null);
  }

  function toggleVendorPaymentPaid(vendorId: string, paymentId: string) {
    const updated = vendors.map((v) => {
      if (v.id !== vendorId) return v;
      return { ...v, payments: (v.payments ?? []).map((p) => p.id === paymentId ? { ...p, paid: !p.paid, paidDate: !p.paid ? new Date().toISOString().split("T")[0] : null } : p) };
    });
    updateEvent(event!.id, { vendors: updated });
  }

  function deleteVendorPayment(vendorId: string, paymentId: string) {
    const updated = vendors.map((v) => v.id === vendorId ? { ...v, payments: (v.payments ?? []).filter((p) => p.id !== paymentId) } : v);
    updateEvent(event!.id, { vendors: updated });
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
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
      </div>{/* end 2-col grid */}

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
                  isExpanded={expandedVendorId === vendor.id}
                  onToggle={() => setExpandedVendorId(expandedVendorId === vendor.id ? null : vendor.id)}
                  onAddPayment={() => addPaymentToVendor(vendor.id)}
                  onTogglePaymentPaid={(paymentId) => toggleVendorPaymentPaid(vendor.id, paymentId)}
                  onDeletePayment={(paymentId) => deleteVendorPayment(vendor.id, paymentId)}
                  addingPayment={addingPaymentForVendor === vendor.id}
                  paymentForm={paymentForm}
                  setPaymentForm={setPaymentForm}
                  setAddingPayment={(v) => setAddingPaymentForVendor(v ? vendor.id : null)}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* ── Budget ── */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
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
                      onClick={(e) => { e.stopPropagation(); deleteBudget(item.id); }}
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

      {/* ── Expenses ── */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6 mt-10">
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

      {/* ── Messages ── */}
      <MessageThread
        messages={event.messages ?? []}
        senderRole="planner"
        senderName="Planner"
        onSend={(msgs: Message[]) => updateEvent(eventId, { messages: msgs })}
      />

      {/* ── Danger Zone ── */}
      <div className="mt-20 pt-8 border-t-2 border-dashed border-stone-200 pb-12">
        <p className="text-center text-[11px] text-stone-300 uppercase tracking-widest font-medium mb-4">Danger Zone</p>
        <div className="flex justify-center">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Delete Event
          </button>
        </div>
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
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Contract Total ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.contractTotal || ""}
            onChange={(e) => onChange({ ...form, contractTotal: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
          <input
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            placeholder="Package details, special instructions…"
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-500 mb-1">Vendor Meal</label>
          <input
            value={form.mealChoice}
            onChange={(e) => onChange({ ...form, mealChoice: e.target.value })}
            placeholder="e.g. Chicken, Vegetarian, Fish…"
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

function VendorRow({ vendor, onEdit, onDelete, isExpanded, onToggle, onAddPayment, onTogglePaymentPaid, onDeletePayment, addingPayment, paymentForm, setPaymentForm, setAddingPayment }: {
  vendor: Vendor; onEdit: () => void; onDelete: () => void;
  isExpanded: boolean; onToggle: () => void;
  onAddPayment: () => void; onTogglePaymentPaid: (paymentId: string) => void; onDeletePayment: (paymentId: string) => void;
  addingPayment: boolean; paymentForm: { description: string; amount: string; dueDate: string };
  setPaymentForm: (f: { description: string; amount: string; dueDate: string }) => void;
  setAddingPayment: (v: boolean) => void;
}) {
  const payments = vendor.payments ?? [];
  const paidAmt = payments.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0);
  const hasContract = vendor.contractTotal > 0;
  const pct = hasContract ? Math.min((paidAmt / vendor.contractTotal) * 100, 100) : 0;
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="rounded-xl border border-stone-100 overflow-hidden">
      <div className="group flex items-start gap-3 py-3 px-3 hover:bg-stone-50 transition-colors cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ChevronRight size={12} className={`text-stone-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            <span className="text-sm font-medium text-stone-800">{vendor.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[vendor.category] ?? "bg-stone-100 text-stone-500"}`}>
              {vendor.category}
            </span>
            {hasContract && (
              <span className="text-[10px] text-stone-400 ml-auto">
                {fmt(paidAmt)} / {fmt(vendor.contractTotal)}
                {paidAmt < vendor.contractTotal && <span className="text-amber-600 font-semibold ml-1.5">{fmt(vendor.contractTotal - paidAmt)} due</span>}
                {paidAmt >= vendor.contractTotal && <span className="text-emerald-600 font-semibold ml-1.5">Paid</span>}
              </span>
            )}
          </div>
          {hasContract && (
            <div className="h-1 bg-stone-100 rounded-full overflow-hidden mt-1.5 ml-5">
              <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-400" : "bg-violet-400"}`} style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 ml-5">
            {vendor.contact && <span className="flex items-center gap-1 text-xs text-stone-400"><User size={11} />{vendor.contact}</span>}
            {vendor.phone && <span className="flex items-center gap-1 text-xs text-stone-400"><Phone size={11} />{vendor.phone}</span>}
            {vendor.email && <span className="flex items-center gap-1 text-xs text-stone-400"><Mail size={11} />{vendor.email}</span>}
          </div>
          {vendor.notes && <p className="text-xs text-stone-400 mt-1 ml-5 italic">{vendor.notes}</p>}
          {vendor.mealChoice && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 mt-1.5 ml-5">
              🍽 {vendor.mealChoice}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded: Payment schedule */}
      {isExpanded && (
        <div className="bg-stone-50/70 px-4 py-3 border-t border-stone-100">
          <div className="ml-5 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Payment Schedule</p>
            {payments.length === 0 && !addingPayment && (
              <p className="text-xs text-stone-400 italic">No payments scheduled yet.</p>
            )}
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center gap-3 group/pay">
                <button
                  onClick={() => onTogglePaymentPaid(payment.id)}
                  className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${payment.paid ? "bg-emerald-400 border-emerald-400 text-white" : "border-stone-300 hover:border-rose-400"}`}
                >
                  {payment.paid && <Check size={10} className="mx-auto" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs ${payment.paid ? "text-stone-400 line-through" : "text-stone-700"}`}>{payment.description}</span>
                  {payment.dueDate && (
                    <span className={`text-[10px] ml-2 ${payment.paid ? "text-stone-300" : new Date(payment.dueDate) < new Date() && !payment.paid ? "text-red-500 font-semibold" : "text-stone-400"}`}>
                      {payment.paid ? `Paid ${payment.paidDate}` : `Due ${payment.dueDate}`}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-medium ${payment.paid ? "text-emerald-600" : "text-stone-600"}`}>{fmt(payment.amount)}</span>
                <button
                  onClick={() => onDeletePayment(payment.id)}
                  className="opacity-0 group-hover/pay:opacity-100 text-stone-300 hover:text-red-400 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {addingPayment ? (
              <div className="pt-2 border-t border-stone-200 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="e.g. Deposit" className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white" />
                  <input type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="Amount" className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white" />
                  <input type="date" value={paymentForm.dueDate} onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })} className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white" />
                </div>
                <div className="flex gap-2">
                  <button onClick={onAddPayment} disabled={!paymentForm.description.trim() || !paymentForm.amount} className="text-xs font-medium bg-rose-400 text-white px-3 py-1.5 rounded-lg hover:bg-rose-500 disabled:opacity-50 transition-colors">Add Payment</button>
                  <button onClick={() => setAddingPayment(false)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setAddingPayment(true); setPaymentForm({ description: "", amount: "", dueDate: "" }); }} className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 pt-1">
                <Plus size={11} /> Add Payment
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
