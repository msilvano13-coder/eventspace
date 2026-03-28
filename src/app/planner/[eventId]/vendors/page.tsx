"use client";

import { useEvent, useStoreActions } from "@/hooks/useStore";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Plus, Pencil, Trash2, Search, Store, ChevronRight,
  User, Phone, Mail, Check, X,
} from "lucide-react";
import { Vendor, VendorCategory, VendorPaymentItem } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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

const ALL_CATEGORIES: VendorCategory[] = [
  "catering", "photography", "videography", "music", "flowers",
  "cake", "venue", "hair & makeup", "transport", "officiant", "other",
];

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function VendorsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const { updateEvent } = useStoreActions();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | VendorCategory>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingVendor, setAddingVendor] = useState(false);
  const [vendorForm, setVendorForm] = useState<Omit<Vendor, "id">>({
    name: "", category: "other", contact: "", phone: "", email: "", notes: "", mealChoice: "", contractTotal: 0, payments: [],
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingPaymentFor, setAddingPaymentFor] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ description: "", amount: "", dueDate: "" });

  if (!event) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Event not found.</p>
        <Link href="/planner" className="text-rose-500 hover:underline text-sm mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const vendors = event.vendors ?? [];

  const filtered = vendors.filter((v) => {
    if (filterCategory !== "all" && v.category !== filterCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return v.name.toLowerCase().includes(q) || v.contact.toLowerCase().includes(q) || v.category.toLowerCase().includes(q);
    }
    return true;
  });

  const totalContracts = vendors.reduce((s, v) => s + (v.contractTotal ?? 0), 0);
  const totalPaid = vendors.reduce((s, v) => s + (v.payments ?? []).filter((p) => p.paid).reduce((ps, p) => ps + p.amount, 0), 0);

  function startAdd() {
    setVendorForm({ name: "", category: "other", contact: "", phone: "", email: "", notes: "", mealChoice: "", contractTotal: 0, payments: [] });
    setEditingId(null);
    setAddingVendor(true);
  }

  function startEdit(v: Vendor) {
    setVendorForm({ name: v.name, category: v.category, contact: v.contact, phone: v.phone, email: v.email, notes: v.notes, mealChoice: v.mealChoice ?? "", contractTotal: v.contractTotal ?? 0, payments: v.payments ?? [] });
    setEditingId(v.id);
    setAddingVendor(false);
  }

  function save() {
    if (!vendorForm.name.trim()) return;
    if (editingId) {
      const updated = vendors.map((v) => v.id === editingId ? { ...v, ...vendorForm } : v);
      updateEvent(event!.id, { vendors: updated });
      setEditingId(null);
    } else {
      const newVendor: Vendor = { id: crypto.randomUUID(), ...vendorForm };
      updateEvent(event!.id, { vendors: [...vendors, newVendor] });
      setAddingVendor(false);
    }
    setVendorForm({ name: "", category: "other", contact: "", phone: "", email: "", notes: "", mealChoice: "", contractTotal: 0, payments: [] });
  }

  function cancel() {
    setAddingVendor(false);
    setEditingId(null);
    setVendorForm({ name: "", category: "other", contact: "", phone: "", email: "", notes: "", mealChoice: "", contractTotal: 0, payments: [] });
  }

  function deleteVendor(id: string) {
    updateEvent(event!.id, { vendors: vendors.filter((v) => v.id !== id) });
    if (editingId === id) cancel();
  }

  function addPayment(vendorId: string) {
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.description.trim() || isNaN(amount) || amount <= 0) return;
    const newPayment: VendorPaymentItem = { id: crypto.randomUUID(), description: paymentForm.description.trim(), amount, dueDate: paymentForm.dueDate, paid: false, paidDate: null };
    const updated = vendors.map((v) => v.id === vendorId ? { ...v, payments: [...(v.payments ?? []), newPayment] } : v);
    updateEvent(event!.id, { vendors: updated });
    setPaymentForm({ description: "", amount: "", dueDate: "" });
    setAddingPaymentFor(null);
  }

  function togglePaymentPaid(vendorId: string, paymentId: string) {
    const updated = vendors.map((v) => {
      if (v.id !== vendorId) return v;
      return { ...v, payments: (v.payments ?? []).map((p) => p.id === paymentId ? { ...p, paid: !p.paid, paidDate: !p.paid ? new Date().toISOString().split("T")[0] : null } : p) };
    });
    updateEvent(event!.id, { vendors: updated });
  }

  function deletePayment(vendorId: string, paymentId: string) {
    const updated = vendors.map((v) => {
      if (v.id !== vendorId) return v;
      return { ...v, payments: (v.payments ?? []).filter((p) => p.id !== paymentId) };
    });
    updateEvent(event!.id, { vendors: updated });
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/planner/${event.id}`} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600">
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="w-px h-5 bg-stone-200" />
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-semibold text-stone-800 truncate">{event.name}</h1>
          <p className="text-xs text-stone-400">Vendors</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors">
          <Plus size={13} /> Add Vendor
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <p className="text-xs text-stone-400 mb-1">Total Vendors</p>
          <p className="text-xl font-heading font-bold text-stone-800">{vendors.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <p className="text-xs text-stone-400 mb-1">Contracts</p>
          <p className="text-xl font-heading font-bold text-stone-800">{fmt(totalContracts)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <p className="text-xs text-stone-400 mb-1">Paid</p>
          <p className="text-xl font-heading font-bold text-emerald-600">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <p className="text-xs text-stone-400 mb-1">Remaining</p>
          <p className={`text-xl font-heading font-bold ${totalContracts - totalPaid > 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(totalContracts - totalPaid)}</p>
        </div>
      </div>

      {/* Search & Filter */}
      {vendors.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors..."
              className="w-full border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as "all" | VendorCategory)}
            className="border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white capitalize"
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Add / Edit Form */}
      {(addingVendor || editingId) && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-5">
          <h3 className="font-heading font-semibold text-stone-800 text-sm mb-4">{editingId ? "Edit Vendor" : "Add Vendor"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Vendor Name *</label>
              <input autoFocus value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} placeholder="e.g. Golden Hour Photography" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
              <select value={vendorForm.category} onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value as VendorCategory })} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white capitalize">
                {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-stone-500 mb-1">Contact</label><input value={vendorForm.contact} onChange={(e) => setVendorForm({ ...vendorForm, contact: e.target.value })} placeholder="Contact person" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none" /></div>
            <div><label className="block text-xs font-medium text-stone-500 mb-1">Phone</label><input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} placeholder="555-0100" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none" /></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-stone-500 mb-1">Email</label><input type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} placeholder="vendor@email.com" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none" /></div>
            <div><label className="block text-xs font-medium text-stone-500 mb-1">Contract Total ($)</label><input type="number" min="0" step="0.01" value={vendorForm.contractTotal || ""} onChange={(e) => setVendorForm({ ...vendorForm, contractTotal: parseFloat(e.target.value) || 0 })} placeholder="0" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none" /></div>
            <div><label className="block text-xs font-medium text-stone-500 mb-1">Notes</label><input value={vendorForm.notes} onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} placeholder="Package details..." className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none" /></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-stone-500 mb-1">Vendor Meal</label><input value={vendorForm.mealChoice} onChange={(e) => setVendorForm({ ...vendorForm, mealChoice: e.target.value })} placeholder="e.g. Chicken, Vegetarian..." className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={save} disabled={!vendorForm.name.trim()} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 disabled:opacity-50 transition-colors">{editingId ? "Save" : "Add Vendor"}</button>
            <button onClick={cancel} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Vendor List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-soft">
          <Store size={24} className="text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-400">{vendors.length === 0 ? "No vendors added yet." : "No vendors match your search."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
          <div className="divide-y divide-stone-100">
            {filtered.map((vendor) =>
              editingId === vendor.id ? null : (
                <div key={vendor.id} className="overflow-hidden">
                  <div className="group flex items-start gap-3 py-3.5 px-5 hover:bg-stone-50/50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === vendor.id ? null : vendor.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ChevronRight size={12} className={`text-stone-400 transition-transform ${expandedId === vendor.id ? "rotate-90" : ""}`} />
                        <span className="text-sm font-medium text-stone-800">{vendor.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[vendor.category] ?? "bg-stone-100 text-stone-500"}`}>{vendor.category}</span>
                        {vendor.contractTotal > 0 && (
                          <span className="text-[10px] text-stone-400 ml-auto">
                            {fmt((vendor.payments ?? []).filter((p) => p.paid).reduce((s, p) => s + p.amount, 0))} / {fmt(vendor.contractTotal)}
                            {(() => {
                              const paid = (vendor.payments ?? []).filter((p) => p.paid).reduce((s, p) => s + p.amount, 0);
                              return paid < vendor.contractTotal
                                ? <span className="text-amber-600 font-semibold ml-1.5">{fmt(vendor.contractTotal - paid)} due</span>
                                : <span className="text-emerald-600 font-semibold ml-1.5">Paid</span>;
                            })()}
                          </span>
                        )}
                      </div>
                      {vendor.contractTotal > 0 && (
                        <div className="h-1 bg-stone-100 rounded-full overflow-hidden mt-1.5 ml-5">
                          <div className={`h-full rounded-full transition-all ${(() => { const paid = (vendor.payments ?? []).filter((p) => p.paid).reduce((s, p) => s + p.amount, 0); return paid >= vendor.contractTotal ? "bg-emerald-400" : "bg-violet-400"; })()}`} style={{ width: `${Math.min(((vendor.payments ?? []).filter((p) => p.paid).reduce((s, p) => s + p.amount, 0) / vendor.contractTotal) * 100, 100)}%` }} />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 ml-5">
                        {vendor.contact && <span className="flex items-center gap-1 text-xs text-stone-400"><User size={11} />{vendor.contact}</span>}
                        {vendor.phone && <span className="flex items-center gap-1 text-xs text-stone-400"><Phone size={11} />{vendor.phone}</span>}
                        {vendor.email && <span className="flex items-center gap-1 text-xs text-stone-400"><Mail size={11} />{vendor.email}</span>}
                      </div>
                      {vendor.notes && <p className="text-xs text-stone-400 mt-1 ml-5 italic">{vendor.notes}</p>}
                      {vendor.mealChoice && <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 mt-1.5 ml-5">🍽 {vendor.mealChoice}</span>}
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(vendor); }} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"><Pencil size={13} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(vendor.id); }} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {/* Expanded: Payments */}
                  {expandedId === vendor.id && (
                    <div className="bg-stone-50/70 px-5 py-3 border-t border-stone-100">
                      <div className="ml-5 space-y-2">
                        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Payment Schedule</p>
                        {(vendor.payments ?? []).length === 0 && addingPaymentFor !== vendor.id && <p className="text-xs text-stone-400 italic">No payments scheduled yet.</p>}
                        {(vendor.payments ?? []).map((payment) => (
                          <div key={payment.id} className="flex items-center gap-3 group/pay">
                            <button onClick={() => togglePaymentPaid(vendor.id, payment.id)} className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${payment.paid ? "bg-emerald-400 border-emerald-400 text-white" : "border-stone-300 hover:border-rose-400"}`}>
                              {payment.paid && <Check size={10} className="mx-auto" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className={`text-xs ${payment.paid ? "text-stone-400 line-through" : "text-stone-700"}`}>{payment.description}</span>
                              {payment.dueDate && <span className={`text-[10px] ml-2 ${payment.paid ? "text-stone-300" : new Date(payment.dueDate) < new Date() && !payment.paid ? "text-red-500 font-semibold" : "text-stone-400"}`}>{payment.paid ? `Paid ${payment.paidDate}` : `Due ${payment.dueDate}`}</span>}
                            </div>
                            <span className={`text-xs font-medium ${payment.paid ? "text-emerald-600" : "text-stone-600"}`}>{fmt(payment.amount)}</span>
                            <button onClick={() => deletePayment(vendor.id, payment.id)} className="opacity-0 group-hover/pay:opacity-100 text-stone-300 hover:text-red-400 transition-all"><X size={12} /></button>
                          </div>
                        ))}
                        {addingPaymentFor === vendor.id ? (
                          <div className="pt-2 border-t border-stone-200 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <input value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="e.g. Deposit" className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white" />
                              <input type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="Amount" className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white" />
                              <input type="date" value={paymentForm.dueDate} onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })} className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => addPayment(vendor.id)} disabled={!paymentForm.description.trim() || !paymentForm.amount} className="text-xs font-medium bg-rose-400 text-white px-3 py-1.5 rounded-lg hover:bg-rose-500 disabled:opacity-50 transition-colors">Add Payment</button>
                              <button onClick={() => setAddingPaymentFor(null)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingPaymentFor(vendor.id); setPaymentForm({ description: "", amount: "", dueDate: "" }); }} className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 pt-1">
                            <Plus size={11} /> Add Payment
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Vendor?"
        message="This vendor and all their payment records will be removed from this event."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId) deleteVendor(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
