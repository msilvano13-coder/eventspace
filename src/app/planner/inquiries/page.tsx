"use client";

import { useInquiries, useInquiryActions, useStoreActions } from "@/hooks/useStore";
import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowRight, Phone, Mail, Calendar, DollarSign, StickyNote } from "lucide-react";
import { Inquiry, InquiryStatus, createDefaultFloorPlans } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function InquiriesPage() {
  const inquiries = useInquiries();
  const { createInquiry, updateInquiry, deleteInquiry } = useInquiryActions();
  const { createEvent } = useStoreActions();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBookId, setConfirmBookId] = useState<string | null>(null);

  const emptyForm = {
    name: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventDate: "",
    venue: "",
    estimatedBudget: "",
    notes: "",
    status: "inquiry" as InquiryStatus,
  };
  const [form, setForm] = useState(emptyForm);

  function startEdit(inq: Inquiry) {
    setForm({
      name: inq.name,
      clientName: inq.clientName,
      clientEmail: inq.clientEmail,
      clientPhone: inq.clientPhone,
      eventDate: inq.eventDate,
      venue: inq.venue,
      estimatedBudget: inq.estimatedBudget,
      notes: inq.notes,
      status: inq.status,
    });
    setEditingId(inq.id);
    setShowForm(true);
  }

  function handleSave() {
    if (editingId) {
      updateInquiry(editingId, form);
    } else {
      createInquiry(form);
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function handleBook(inq: Inquiry) {
    createEvent({
      name: inq.name,
      date: inq.eventDate,
      venue: inq.venue,
      clientName: inq.clientName,
      clientEmail: inq.clientEmail,
      status: "planning",
      floorPlanJSON: null,
      floorPlans: createDefaultFloorPlans(),
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
    });
    deleteInquiry(inq.id);
    setConfirmBookId(null);
  }

  const inquiryList = inquiries.filter((i) => i.status === "inquiry");
  const consultationList = inquiries.filter((i) => i.status === "consultation");

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-800">Inquiries</h1>
          <p className="text-sm text-stone-400 mt-1">
            {inquiries.length} lead{inquiries.length !== 1 ? "s" : ""} in your pipeline
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-soft"
        >
          <Plus size={16} />
          New Inquiry
        </button>
      </div>

      {/* Pipeline columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inquiry column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              Inquiry
            </span>
            <span className="text-xs text-stone-400">{inquiryList.length}</span>
          </div>
          <div className="space-y-3">
            {inquiryList.map((inq) => (
              <InquiryCard
                key={inq.id}
                inquiry={inq}
                expanded={expandedId === inq.id}
                onToggle={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
                onEdit={() => startEdit(inq)}
                onDelete={() => setConfirmDeleteId(inq.id)}
                onAdvance={() => updateInquiry(inq.id, { status: "consultation" })}
                onBook={() => setConfirmBookId(inq.id)}
                advanceLabel="Move to Consultation"
              />
            ))}
            {inquiryList.length === 0 && (
              <p className="text-xs text-stone-300 text-center py-8">No new inquiries</p>
            )}
          </div>
        </div>

        {/* Consultation column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">
              Consultation
            </span>
            <span className="text-xs text-stone-400">{consultationList.length}</span>
          </div>
          <div className="space-y-3">
            {consultationList.map((inq) => (
              <InquiryCard
                key={inq.id}
                inquiry={inq}
                expanded={expandedId === inq.id}
                onToggle={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
                onEdit={() => startEdit(inq)}
                onDelete={() => setConfirmDeleteId(inq.id)}
                onAdvance={undefined}
                onBook={() => setConfirmBookId(inq.id)}
                advanceLabel=""
              />
            ))}
            {consultationList.length === 0 && (
              <p className="text-xs text-stone-300 text-center py-8">No consultations scheduled</p>
            )}
          </div>
        </div>
      </div>

      {/* New / Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-heading font-semibold text-stone-800 mb-5">
              {editingId ? "Edit Inquiry" : "New Inquiry"}
            </h2>
            <div className="space-y-3.5">
              {[
                { key: "name", label: "Event Name", type: "text", placeholder: "Smith Wedding" },
                { key: "clientName", label: "Client Name", type: "text", placeholder: "Jane Smith" },
                { key: "clientEmail", label: "Email", type: "email", placeholder: "jane@example.com" },
                { key: "clientPhone", label: "Phone", type: "tel", placeholder: "(555) 123-4567" },
                { key: "eventDate", label: "Tentative Date", type: "date", placeholder: "" },
                { key: "venue", label: "Venue (if known)", type: "text", placeholder: "TBD" },
                { key: "estimatedBudget", label: "Estimated Budget", type: "text", placeholder: "$25,000" },
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
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="How did they find you? Any details about the event..."
                  rows={3}
                  className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none transition-colors resize-none"
                />
              </div>
              {editingId && (
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as InquiryStatus })}
                    className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
                  >
                    <option value="inquiry">Inquiry</option>
                    <option value="consultation">Consultation</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.clientName}
                className="bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {editingId ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Inquiry?"
        message="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { if (confirmDeleteId) { deleteInquiry(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Book confirm */}
      {confirmBookId && (() => {
        const inq = inquiries.find((i) => i.id === confirmBookId);
        if (!inq) return null;
        return (
          <div
            className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => e.target === e.currentTarget && setConfirmBookId(null)}
          >
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
              <h3 className="font-heading font-semibold text-stone-800 mb-2">Book as Event?</h3>
              <p className="text-sm text-stone-500 mb-5">
                This will create <strong>{inq.name}</strong> as an event and remove it from inquiries.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmBookId(null)} className="px-4 py-2 text-sm text-stone-500 rounded-xl">
                  Cancel
                </button>
                <button
                  onClick={() => handleBook(inq)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <ArrowRight size={14} />
                  Book Event
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function InquiryCard({
  inquiry,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAdvance,
  onBook,
  advanceLabel,
}: {
  inquiry: Inquiry;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdvance: (() => void) | undefined;
  onBook: () => void;
  advanceLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-stone-50/50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading font-semibold text-stone-800 text-sm">{inquiry.name}</h3>
            <p className="text-xs text-stone-400 mt-0.5">{inquiry.clientName}</p>
          </div>
          <span className="text-[10px] text-stone-300">
            {new Date(inquiry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        {inquiry.eventDate && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-stone-400">
            <Calendar size={12} />
            {new Date(inquiry.eventDate + "T00:00:00").toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-100 pt-3 space-y-2.5">
          {inquiry.clientEmail && (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Mail size={12} className="text-stone-400" />
              {inquiry.clientEmail}
            </div>
          )}
          {inquiry.clientPhone && (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Phone size={12} className="text-stone-400" />
              {inquiry.clientPhone}
            </div>
          )}
          {inquiry.venue && (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <StickyNote size={12} className="text-stone-400" />
              Venue: {inquiry.venue}
            </div>
          )}
          {inquiry.estimatedBudget && (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <DollarSign size={12} className="text-stone-400" />
              Budget: {inquiry.estimatedBudget}
            </div>
          )}
          {inquiry.notes && (
            <p className="text-xs text-stone-400 bg-stone-50 rounded-lg p-2.5">{inquiry.notes}</p>
          )}

          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {onAdvance && (
              <button
                onClick={onAdvance}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
              >
                <ArrowRight size={12} />
                {advanceLabel}
              </button>
            )}
            <button
              onClick={onBook}
              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
            >
              <ArrowRight size={12} />
              Book as Event
            </button>
            <div className="flex-1" />
            <button onClick={onEdit} className="text-stone-400 hover:text-stone-600 p-1">
              <Pencil size={13} />
            </button>
            <button onClick={onDelete} className="text-stone-400 hover:text-red-500 p-1">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
