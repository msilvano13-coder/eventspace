"use client";

import { useEvent, useEventSubEntities, useStoreActions, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Receipt,
} from "lucide-react";
import { Invoice, InvoiceLineItem } from "@/lib/types";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-100 text-stone-500",
  sent: "bg-blue-50 text-blue-600",
  paid: "bg-emerald-50 text-emerald-600",
};

export default function InvoicesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["invoices", "vendors"]);
  const { updateEvent } = useStoreActions();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [formNumber, setFormNumber] = useState("");
  const [formStatus, setFormStatus] = useState<"draft" | "sent" | "paid">("draft");
  const [formDueDate, setFormDueDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<InvoiceLineItem[]>([]);

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;

  if (!event) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Event not found.</p>
        <Link href="/planner" className="text-rose-500 hover:underline text-sm mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const invoices = event.invoices ?? [];

  function nextNumber() {
    const nums = invoices.map((inv) => {
      const m = inv.number.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `INV-${String(max + 1).padStart(3, "0")}`;
  }

  function startCreate() {
    setFormNumber(nextNumber());
    setFormStatus("draft");
    setFormDueDate("");
    setFormNotes("");
    setFormItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
    setEditingId(null);
    setCreating(true);
  }

  function startEdit(inv: Invoice) {
    setFormNumber(inv.number);
    setFormStatus(inv.status);
    setFormDueDate(inv.dueDate ?? "");
    setFormNotes(inv.notes);
    setFormItems(inv.lineItems.map((li) => ({ ...li })));
    setEditingId(inv.id);
    setCreating(false);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
  }

  function addLineItem() {
    setFormItems([...formItems, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  }

  function updateLineItem(id: string, field: keyof InvoiceLineItem, value: string | number) {
    setFormItems(formItems.map((li) => li.id === id ? { ...li, [field]: value } : li));
  }

  function removeLineItem(id: string) {
    if (formItems.length <= 1) return;
    setFormItems(formItems.filter((li) => li.id !== id));
  }

  function formTotal() {
    return formItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  }

  function saveForm() {
    const cleanItems = formItems.filter((li) => li.description.trim());
    if (!formNumber.trim() || cleanItems.length === 0) return;

    if (editingId) {
      const updated = invoices.map((inv) =>
        inv.id === editingId
          ? { ...inv, number: formNumber.trim(), status: formStatus, dueDate: formDueDate || null, notes: formNotes, lineItems: cleanItems }
          : inv
      );
      updateEvent(eventId, { invoices: updated });
    } else {
      const newInv: Invoice = {
        id: crypto.randomUUID(),
        number: formNumber.trim(),
        status: formStatus,
        lineItems: cleanItems,
        notes: formNotes,
        dueDate: formDueDate || null,
        createdAt: new Date().toISOString(),
      };
      updateEvent(eventId, { invoices: [...invoices, newInv] });
    }
    cancelForm();
  }

  function deleteInvoice(id: string) {
    updateEvent(eventId, { invoices: invoices.filter((inv) => inv.id !== id) });
    if (editingId === id) cancelForm();
  }

  function updateStatus(id: string, status: "draft" | "sent" | "paid") {
    const updated = invoices.map((inv) => inv.id === id ? { ...inv, status } : inv);
    updateEvent(eventId, { invoices: updated });
  }

  function invoiceTotal(inv: Invoice) {
    return inv.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  }

  const grandTotal = invoices.reduce((sum, inv) => sum + invoiceTotal(inv), 0);
  const paidTotal = invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + invoiceTotal(inv), 0);
  const outstandingTotal = grandTotal - paidTotal;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link
          href={`/planner/${eventId}`}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="w-px h-5 bg-stone-200" />
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-semibold text-stone-800 text-sm sm:text-base truncate">{event.name}</h1>
          <p className="text-xs text-stone-400">Invoices</p>
        </div>
        {!creating && !editingId && (
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 text-xs font-medium bg-rose-400 hover:bg-rose-500 text-white px-3 py-2 rounded-xl transition-colors"
          >
            <Plus size={13} />
            New Invoice
          </button>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Summary cards */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft text-center">
              <p className="text-xs text-stone-400 mb-1">Total</p>
              <p className="text-lg font-heading font-bold text-stone-800">{fmtCurrency(grandTotal)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft text-center">
              <p className="text-xs text-stone-400 mb-1">Paid</p>
              <p className="text-lg font-heading font-bold text-emerald-600">{fmtCurrency(paidTotal)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft text-center">
              <p className="text-xs text-stone-400 mb-1">Outstanding</p>
              <p className="text-lg font-heading font-bold text-amber-600">{fmtCurrency(outstandingTotal)}</p>
            </div>
          </div>
        )}

        {/* Invoice form */}
        {(creating || editingId) && (
          <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-soft mb-6 space-y-4">
            <h2 className="font-heading font-semibold text-stone-800">
              {editingId ? "Edit Invoice" : "New Invoice"}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Invoice # *</label>
                <input
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Status</label>
                <div className="relative">
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "draft" | "sent" | "paid")}
                    className="w-full appearance-none border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>
            </div>

            {/* Line items */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-2">Line Items</label>
              <div className="space-y-2">
                {/* Header */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_80px_100px_32px] gap-2 text-[11px] text-stone-400 font-medium px-1">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Unit Price</span>
                  <span />
                </div>
                {formItems.map((li) => (
                  <div key={li.id} className="grid grid-cols-[1fr_60px_90px_28px] sm:grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
                    <input
                      value={li.description}
                      onChange={(e) => updateLineItem(li.id, "description", e.target.value)}
                      placeholder="Description"
                      className="border border-stone-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                    />
                    <input
                      type="number"
                      min="1"
                      value={li.quantity}
                      onChange={(e) => updateLineItem(li.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      className="border border-stone-200 rounded-lg px-2 py-2 text-sm text-center focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.unitPrice || ""}
                        onChange={(e) => updateLineItem(li.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0.00"
                        className="w-full border border-stone-200 rounded-lg pl-5 pr-2 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => removeLineItem(li.id)}
                      disabled={formItems.length <= 1}
                      className="p-1 text-stone-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addLineItem}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium mt-2"
              >
                + Add line item
              </button>
            </div>

            {/* Total */}
            <div className="flex justify-end border-t border-stone-100 pt-3">
              <div className="text-right">
                <span className="text-xs text-stone-400">Total: </span>
                <span className="text-base font-heading font-bold text-stone-800">{fmtCurrency(formTotal())}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
              <input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Payment instructions, additional details..."
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={saveForm}
                disabled={!formNumber.trim() || formItems.every((li) => !li.description.trim())}
                className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 disabled:opacity-50 transition-colors"
              >
                {editingId ? "Save" : "Create Invoice"}
              </button>
              <button onClick={cancelForm} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Invoice list */}
        {invoices.length === 0 && !creating ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
            <Receipt size={40} className="text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500 mb-3">No invoices yet.</p>
            <button onClick={startCreate} className="text-sm text-rose-500 hover:text-rose-600 font-medium">
              + Create your first invoice
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const total = invoiceTotal(inv);
              const isExpanded = expandedId === inv.id;
              if (editingId === inv.id) return null;

              return (
                <div key={inv.id} className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <DollarSign size={16} className="text-stone-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-stone-800">{inv.number}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status]}`}>
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {fmtCurrency(total)}
                          {inv.dueDate && (
                            <> &middot; Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                          )}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-stone-100 px-5 py-4">
                      {/* Line items table */}
                      <div className="space-y-1.5 mb-3">
                        <div className="grid grid-cols-[1fr_50px_70px_70px] text-[11px] text-stone-400 font-medium">
                          <span>Item</span>
                          <span className="text-right">Qty</span>
                          <span className="text-right">Price</span>
                          <span className="text-right">Total</span>
                        </div>
                        {inv.lineItems.map((li) => (
                          <div key={li.id} className="grid grid-cols-[1fr_50px_70px_70px] text-sm">
                            <span className="text-stone-700">{li.description}</span>
                            <span className="text-right text-stone-500">{li.quantity}</span>
                            <span className="text-right text-stone-500">{fmtCurrency(li.unitPrice)}</span>
                            <span className="text-right font-medium text-stone-700">{fmtCurrency(li.quantity * li.unitPrice)}</span>
                          </div>
                        ))}
                        <div className="grid grid-cols-[1fr_50px_70px_70px] text-sm border-t border-stone-100 pt-1.5">
                          <span />
                          <span />
                          <span className="text-right text-xs text-stone-400 font-medium">Total</span>
                          <span className="text-right font-bold text-stone-800">{fmtCurrency(total)}</span>
                        </div>
                      </div>

                      {inv.notes && (
                        <p className="text-xs text-stone-400 italic mb-3">{inv.notes}</p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {inv.status === "draft" && (
                          <button
                            onClick={() => updateStatus(inv.id, "sent")}
                            className="text-xs font-medium text-blue-500 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Mark as Sent
                          </button>
                        )}
                        {inv.status === "sent" && (
                          <button
                            onClick={() => updateStatus(inv.id, "paid")}
                            className="text-xs font-medium text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Mark as Paid
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(inv)}
                          className="text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-100 p-1.5 rounded-lg transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(inv.id)}
                          className="text-xs text-stone-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Invoice?"
        message="This invoice will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId) deleteInvoice(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
