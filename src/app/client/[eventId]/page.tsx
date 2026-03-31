"use client";

import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, useStoreActions, useQuestionnaires, usePlannerProfile, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Calendar, MapPin, FileText, CheckSquare, Check, Circle, Clock, Layout, ClipboardList, ChevronDown, ChevronUp, CheckCircle2, Receipt, Users, Wallet, Search, Phone, Globe, Download, Upload, UserCheck, PenTool, Plus, Trash2, Pencil, X, UtensilsCrossed, AlertTriangle, Image } from "lucide-react";
import { Question, Invoice, Event, Guest, RsvpStatus, Message, BudgetItem, BUDGET_CATEGORIES, VENDOR_TO_BUDGET_CATEGORY, Vendor, VendorCategory, EventContract, ScheduleItem } from "@/lib/types";
import { readPdfAsBase64, downloadBase64File, formatBytes } from "@/lib/pdf-utils";
import MessageThread from "@/components/event/MessageThread";
import SignaturePad from "@/components/ui/SignaturePad";

function fmt12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function invoiceTotal(inv: Invoice) {
  return inv.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
}

// ── Client Storage helpers (uses API routes, no auth session needed) ──

async function getClientSignedUrl(shareToken: string, bucket: string, path: string): Promise<string> {
  const res = await fetch("/api/storage/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shareToken, bucket, path }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to get signed URL");
  return data.url;
}

async function uploadClientFile(shareToken: string, bucket: string, path: string, file: Blob | File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("shareToken", shareToken);
  formData.append("bucket", bucket);
  formData.append("path", path);
  const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to upload file");
  return data.path;
}

const INV_STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-100 text-stone-500",
  sent: "bg-blue-50 text-blue-600",
  paid: "bg-emerald-50 text-emerald-600",
};

export default function ClientPortalPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["timeline", "schedule", "vendors", "guests", "messages", "contracts", "invoices", "budget", "files", "questionnaires", "discoveredVendors"]);
  const { updateEvent } = useStoreActions();
  const allQuestionnaires = useQuestionnaires();
  const profile = usePlannerProfile();
  const [openQId, setOpenQId] = useState<string | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState("");

  if (loading) return <EventLoader />;

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <p className="text-stone-500 mb-2">Event not found or link is invalid.</p>
          <p className="text-xs text-stone-400">Please check your link and try again.</p>
        </div>
      </div>
    );
  }

  const todos = [...(event.timeline ?? [])].sort((a, b) => a.order - b.order);
  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-heading font-bold text-white text-sm shrink-0"
              style={{ backgroundColor: profile.brandColor || "#e88b8b" }}
            >
              {(profile.businessName || "E")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-heading font-semibold text-stone-800 truncate">{event.name}</h1>
            <p className="text-xs text-stone-400">
              {profile.businessName ? `by ${profile.businessName}` : "Client Portal"}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">

        {/* Date & Venue */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-stone-600">
            <span className="flex items-center gap-2">
              <Calendar size={15} className="text-rose-400 shrink-0" />
              <span className="font-medium">
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                })}
              </span>
            </span>
            <span className="hidden sm:block text-stone-200">·</span>
            <span className="flex items-center gap-2">
              <MapPin size={15} className="text-rose-400 shrink-0" />
              <span>{event.venue}</span>
            </span>
          </div>
        </div>

        {/* Color Palette */}
        <ClientColorPalette event={event} onUpdate={(colors) => updateEvent(event.id, { colorPalette: colors })} />

        {/* Day Timeline — editable */}
        <ClientTimeline
          event={event}
          onUpdate={(schedule) => updateEvent(event.id, { schedule })}
        />

        {/* Quick links row */}
        <div className="grid grid-cols-2 gap-3">
          {(event.floorPlanJSON || (event.floorPlans ?? []).some((fp) => fp.json)) && (
            <Link
              href={`/client/${event.id}/floorplan`}
              className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
            >
              <Layout size={22} className="text-rose-400 mb-2" />
              <h3 className="font-heading font-semibold text-stone-800 group-hover:text-rose-500 text-sm">Floor Plan</h3>
              <p className="text-xs text-stone-400 mt-1">View the layout</p>
            </Link>
          )}
          <Link
            href={`/client/${event.id}/moodboard`}
            className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
          >
            <Image size={22} className="text-pink-400 mb-2" />
            <h3 className="font-heading font-semibold text-stone-800 group-hover:text-pink-500 text-sm">Mood Board</h3>
            <p className="text-xs text-stone-400 mt-1">{(event.moodBoard ?? []).length} images</p>
          </Link>
          <Link
            href={`/client/${event.id}/files`}
            className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
          >
            <FileText size={22} className="text-blue-400 mb-2" />
            <h3 className="font-heading font-semibold text-stone-800 group-hover:text-blue-500 text-sm">Files</h3>
            <p className="text-xs text-stone-400 mt-1">{(event.files ?? []).length} shared files</p>
          </Link>
          {(event.invoices ?? []).filter((inv) => inv.status !== "draft").length > 0 && (
            <a
              href="#invoices"
              className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
            >
              <Receipt size={22} className="text-emerald-400 mb-2" />
              <h3 className="font-heading font-semibold text-stone-800 group-hover:text-emerald-500 text-sm">Invoices</h3>
              <p className="text-xs text-stone-400 mt-1">
                {(event.invoices ?? []).filter((inv) => inv.status !== "draft").length} invoice{(event.invoices ?? []).filter((inv) => inv.status !== "draft").length !== 1 ? "s" : ""}
              </p>
            </a>
          )}
          <Link
            href={`/client/${event.id}/wedding`}
            className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
          >
            <Globe size={22} className="text-rose-400 mb-2" />
            <h3 className="font-heading font-semibold text-stone-800 group-hover:text-rose-500 text-sm">Wedding Website</h3>
            <p className="text-xs text-stone-400 mt-1">{event.weddingPageEnabled ? "Published — Edit" : "Set up your page"}</p>
          </Link>
        </div>

        {/* To Do List — client can toggle, add, edit, delete */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <CheckSquare size={15} className="text-emerald-400" />
              <h2 className="font-heading font-semibold text-stone-800">Planning Progress</h2>
            </div>
            {todos.length > 0 && (
              <span className="text-xs text-stone-400 font-medium">
                {completedCount}/{todos.length} complete
              </span>
            )}
          </div>

          {/* Progress bar */}
          {todos.length > 0 && (
            <div className="px-5 pt-3 pb-1">
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${(completedCount / todos.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="px-5 py-3 space-y-0.5">
            {todos.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2 w-full hover:bg-stone-50 rounded-lg px-1 -mx-1 transition-colors group"
              >
                <button
                  onClick={() => {
                    const updated = (event.timeline ?? []).map((t) =>
                      t.id === item.id ? { ...t, completed: !t.completed } : t
                    );
                    updateEvent(eventId, { timeline: updated });
                  }}
                  className="shrink-0"
                >
                  {item.completed ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Circle size={14} className="text-stone-300" />
                  )}
                </button>

                {editingTodoId === item.id ? (
                  <form
                    className="flex-1 flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!editingTodoTitle.trim()) return;
                      const updated = (event.timeline ?? []).map((t) =>
                        t.id === item.id ? { ...t, title: editingTodoTitle.trim() } : t
                      );
                      updateEvent(eventId, { timeline: updated });
                      setEditingTodoId(null);
                    }}
                  >
                    <input
                      autoFocus
                      className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-300"
                      value={editingTodoTitle}
                      onChange={(e) => setEditingTodoTitle(e.target.value)}
                      onBlur={() => setEditingTodoId(null)}
                      onKeyDown={(e) => { if (e.key === "Escape") setEditingTodoId(null); }}
                    />
                  </form>
                ) : (
                  <>
                    <span className={`text-sm flex-1 ${item.completed ? "line-through text-stone-400" : "text-stone-700"}`}>
                      {item.title}
                    </span>
                    {item.dueDate && (
                      <span className="text-xs text-stone-400 shrink-0">
                        {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <button
                      onClick={() => { setEditingTodoId(item.id); setEditingTodoTitle(item.title); }}
                      className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-stone-500 transition-all shrink-0"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => {
                        const updated = (event.timeline ?? []).filter((t) => t.id !== item.id);
                        updateEvent(eventId, { timeline: updated });
                      }}
                      className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all shrink-0"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Add new to-do */}
            <form
              className="flex items-center gap-3 py-2 px-1 -mx-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTodoTitle.trim()) return;
                const newItem = {
                  id: crypto.randomUUID(),
                  title: newTodoTitle.trim(),
                  dueDate: null,
                  completed: false,
                  order: todos.length,
                };
                updateEvent(eventId, { timeline: [...(event.timeline ?? []), newItem] });
                setNewTodoTitle("");
              }}
            >
              <Plus size={14} className="text-stone-300 shrink-0" />
              <input
                className="flex-1 text-sm placeholder:text-stone-300 bg-transparent focus:outline-none"
                placeholder="Add a to-do..."
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
              />
            </form>
          </div>
        </div>

        {/* Questionnaires */}
        {(event.questionnaires ?? []).length > 0 && (
          <div className="space-y-3">
            {(event.questionnaires ?? []).map((assignment) => {
              const template = allQuestionnaires.find((q) => q.id === assignment.questionnaireId);
              const questions = template?.questions ?? [];
              const isOpen = openQId === assignment.questionnaireId;
              const answeredCount = Object.keys(assignment.answers).length;
              const isComplete = assignment.completedAt !== null;
              const allAnswered = questions.length > 0 && questions.filter((q) => q.required).every((q) => {
                const ans = assignment.answers[q.id];
                return ans !== undefined && ans !== "" && (!Array.isArray(ans) || ans.length > 0);
              });

              return (
                <div key={assignment.questionnaireId} className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
                  <button
                    onClick={() => setOpenQId(isOpen ? null : assignment.questionnaireId)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ClipboardList size={15} className="text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <h2 className="font-heading font-semibold text-stone-800 truncate">{assignment.questionnaireName}</h2>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {isComplete ? (
                            <span className="text-emerald-500 font-medium">Completed</span>
                          ) : (
                            <>{answeredCount}/{questions.length} answered</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isComplete && <CheckCircle2 size={16} className="text-emerald-400" />}
                      {isOpen ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                    </div>
                  </button>

                  {isOpen && questions.length > 0 && (
                    <div className="border-t border-stone-100 px-5 py-5 space-y-5">
                      {questions.map((q, idx) => (
                        <ClientQuestionField
                          key={q.id}
                          question={q}
                          index={idx}
                          value={assignment.answers[q.id]}
                          disabled={isComplete}
                          onChange={(val) => {
                            const updated = (event!.questionnaires ?? []).map((a) =>
                              a.questionnaireId === assignment.questionnaireId
                                ? { ...a, answers: { ...a.answers, [q.id]: val } }
                                : a
                            );
                            updateEvent(eventId, { questionnaires: updated });
                          }}
                        />
                      ))}

                      {!isComplete && (
                        <div className="pt-2 border-t border-stone-100">
                          <button
                            onClick={() => {
                              const updated = (event!.questionnaires ?? []).map((a) =>
                                a.questionnaireId === assignment.questionnaireId
                                  ? { ...a, completedAt: new Date().toISOString() }
                                  : a
                              );
                              updateEvent(eventId, { questionnaires: updated });
                            }}
                            disabled={!allAnswered}
                            className="w-full sm:w-auto bg-rose-400 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                          >
                            Submit Questionnaire
                          </button>
                          {!allAnswered && questions.some((q) => q.required) && (
                            <p className="text-xs text-stone-400 mt-2">Please answer all required questions before submitting.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Guest RSVP */}
        <ClientGuestRSVP
          event={event}
          onUpdate={(guests) => updateEvent(event.id, { guests })}
        />

        {/* Budget */}
        <ClientBudget
          event={event}
          onUpdate={(budget) => updateEvent(event.id, { budget })}
        />

        {/* Assigned Vendors (wedding team) */}
        {(event.vendors ?? []).length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-stone-100">
              <Users size={15} className="text-rose-400" />
              <h2 className="font-heading font-semibold text-stone-800">Your Vendors</h2>
              <span className="text-xs text-stone-400 ml-1">({(event.vendors ?? []).length})</span>
            </div>
            <div className="divide-y divide-stone-100">
              {(event.vendors ?? []).map((vendor) => (
                <div key={vendor.id} className="px-5 py-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-stone-800">{vendor.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-rose-50 text-rose-500 capitalize shrink-0">
                          {vendor.category}
                        </span>
                      </div>
                      {vendor.contact && vendor.contact !== vendor.name && (
                        <p className="text-xs text-stone-500">Contact: {vendor.contact}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (!confirm(`Remove ${vendor.name} from your vendors?`)) return;
                        updateEvent(event.id, {
                          vendors: (event.vendors ?? []).filter((v) => v.id !== vendor.id),
                        });
                      }}
                      className="text-stone-300 hover:text-red-500 transition-colors p-1 -mr-1 shrink-0"
                      title="Remove vendor"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    {vendor.phone && (
                      <a href={`tel:${vendor.phone}`} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-rose-500 transition-colors">
                        <Phone size={11} className="text-stone-400 shrink-0" />
                        {vendor.phone}
                      </a>
                    )}
                    {vendor.email && (
                      <a href={`mailto:${vendor.email}`} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-rose-500 transition-colors">
                        <span className="text-stone-400 shrink-0 text-[10px]">✉</span>
                        {vendor.email}
                      </a>
                    )}
                  </div>
                  {vendor.notes && (
                    <p className="text-xs text-stone-400 mt-1.5 italic">{vendor.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discovered Vendors */}
        {(event.discoveredVendors ?? []).length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-stone-100">
              <Search size={15} className="text-teal-400" />
              <h2 className="font-heading font-semibold text-stone-800">Discovered Vendors</h2>
              <span className="text-xs text-stone-400 ml-1">({(event.discoveredVendors ?? []).length})</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(event.discoveredVendors ?? []).map((v) => (
                <div key={v.id} className="border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors relative">
                  <div className="flex items-start justify-between mb-1.5">
                    <h3 className="text-sm font-semibold text-stone-800 leading-tight">{v.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-teal-50 text-teal-600 capitalize shrink-0 ml-2">
                      {v.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const full = Math.floor(v.rating);
                        return (
                          <svg key={i} xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill={i < full ? "#fbbf24" : "none"} stroke={i < full ? "#fbbf24" : "#d6d3d1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        );
                      })}
                    </span>
                    <span className="text-xs text-stone-600 font-medium">{v.rating.toFixed(1)}</span>
                    <span className="text-xs text-stone-400">({v.reviewCount})</span>
                  </div>
                  <div className="space-y-1">
                    {v.address && (
                      <p className="flex items-start gap-1.5 text-xs text-stone-500">
                        <MapPin size={11} className="text-stone-400 mt-0.5 shrink-0" />
                        <span>{v.address}</span>
                      </p>
                    )}
                    {v.phone && (
                      <p className="flex items-center gap-1.5 text-xs text-stone-500">
                        <Phone size={11} className="text-stone-400 shrink-0" />
                        <a href={`tel:${v.phone}`} className="hover:text-rose-500 transition-colors">{v.phone}</a>
                      </p>
                    )}
                    {v.website && (
                      <p className="flex items-center gap-1.5 text-xs text-stone-500 min-w-0">
                        <Globe size={11} className="text-stone-400 shrink-0" />
                        <a href={v.website} target="_blank" rel="noopener noreferrer" className="hover:text-rose-500 transition-colors truncate">
                          {v.website.replace(/^https?:\/\//, "")}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-stone-100">
                    {/* Check if already accepted (exists in vendors list) */}
                    {(event.vendors ?? []).some((ev) => ev.name === v.name && ev.phone === v.phone) ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 size={13} />
                        Accepted
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          const validCategories: VendorCategory[] = [
                            "catering", "photography", "videography", "music", "flowers",
                            "cake", "venue", "hair & makeup", "transport", "officiant", "other",
                          ];
                          const mappedCategory = validCategories.includes(v.category as VendorCategory)
                            ? (v.category as VendorCategory)
                            : "other";

                          const newVendor: Vendor = {
                            id: crypto.randomUUID(),
                            name: v.name,
                            category: mappedCategory,
                            contact: v.name,
                            phone: v.phone || "",
                            email: "",
                            notes: "",
                            mealChoice: "",
                            contractTotal: 0,
                            payments: [],
                          };

                          updateEvent(event.id, {
                            vendors: [...(event.vendors || []), newVendor],
                          });
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Check size={12} />
                        Accept Vendor
                      </button>
                    )}
                    <div className="flex-1" />
                    {v.googleMapsUrl && (
                      <a
                        href={v.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        Maps
                        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        {(event.invoices ?? []).filter((inv) => inv.status !== "draft").length > 0 && (
          <div id="invoices" className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden scroll-mt-4">
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-stone-100">
              <Receipt size={15} className="text-emerald-400" />
              <h2 className="font-heading font-semibold text-stone-800">Invoices</h2>
            </div>
            <div className="divide-y divide-stone-100">
              {(event.invoices ?? [])
                .filter((inv) => inv.status !== "draft")
                .map((inv) => {
                  const total = invoiceTotal(inv);
                  return (
                    <div key={inv.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-stone-800">{inv.number}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${INV_STATUS_COLORS[inv.status]}`}>
                            {inv.status}
                          </span>
                        </div>
                        <span className="text-sm font-heading font-bold text-stone-800">{fmtCurrency(total)}</span>
                      </div>
                      <div className="space-y-1">
                        {inv.lineItems.map((li) => (
                          <div key={li.id} className="flex items-center justify-between text-xs text-stone-500">
                            <span>{li.description}</span>
                            <span>{li.quantity} x {fmtCurrency(li.unitPrice)}</span>
                          </div>
                        ))}
                      </div>
                      {inv.dueDate && (
                        <p className="text-xs text-stone-400 mt-2">
                          Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                      {inv.notes && (
                        <p className="text-xs text-stone-400 mt-1 italic">{inv.notes}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Contracts */}
        {(event.contracts ?? []).length > 0 && (
          <ClientContractsSection event={event} updateEvent={updateEvent} />
        )}

        {/* Messages */}
        <MessageThread
          messages={event.messages ?? []}
          senderRole="client"
          senderName={event.clientName || "Client"}
          onSend={(msgs: Message[]) => updateEvent(event.id, { messages: msgs })}
        />

        <div className="text-center pb-6 pt-2">
          {profile.businessName && (
            <p className="text-xs text-stone-400 mb-0.5">
              Planned by <span className="font-medium">{profile.businessName}</span>
              {profile.website && (
                <> · <span className="text-stone-300">{profile.website}</span></>
              )}
            </p>
          )}
          <p className="text-[10px] text-stone-300">Powered by EventSpace</p>
        </div>
      </div>
    </div>
  );
}

// ── Client question field component ──
function ClientQuestionField({
  question,
  index,
  value,
  disabled,
  onChange,
}: {
  question: Question;
  index: number;
  value: string | string[] | undefined;
  disabled: boolean;
  onChange: (val: string | string[]) => void;
}) {
  const strVal = typeof value === "string" ? value : "";
  const arrVal = Array.isArray(value) ? value : [];

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">
        <span className="text-stone-400 mr-1">{index + 1}.</span>
        {question.label}
        {question.required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>

      {question.type === "text" && (
        <input
          type="text"
          value={strVal}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer..."
          className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none disabled:bg-stone-50 disabled:text-stone-500"
        />
      )}

      {question.type === "textarea" && (
        <textarea
          value={strVal}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer..."
          rows={3}
          className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none resize-y disabled:bg-stone-50 disabled:text-stone-500"
        />
      )}

      {question.type === "date" && (
        <input
          type="date"
          value={strVal}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none disabled:bg-stone-50 disabled:text-stone-500"
        />
      )}

      {question.type === "select" && question.options && (
        <div className="space-y-1.5">
          {question.options.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                strVal === opt
                  ? "border-rose-300 bg-rose-50/60"
                  : "border-stone-200 hover:bg-stone-50"
              } ${disabled ? "cursor-default opacity-75" : ""}`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                strVal === opt ? "border-rose-400" : "border-stone-300"
              }`}>
                {strVal === opt && <div className="w-2 h-2 rounded-full bg-rose-400" />}
              </div>
              <span className="text-sm text-stone-700">{opt}</span>
              <input
                type="radio"
                name={question.id}
                value={opt}
                checked={strVal === opt}
                disabled={disabled}
                onChange={() => onChange(opt)}
                className="sr-only"
              />
            </label>
          ))}
        </div>
      )}

      {question.type === "multiselect" && question.options && (
        <div className="space-y-1.5">
          {question.options.map((opt) => {
            const checked = arrVal.includes(opt);
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  checked
                    ? "border-rose-300 bg-rose-50/60"
                    : "border-stone-200 hover:bg-stone-50"
                } ${disabled ? "cursor-default opacity-75" : ""}`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  checked ? "border-rose-400 bg-rose-400" : "border-stone-300"
                }`}>
                  {checked && <Check size={10} className="text-white" />}
                </div>
                <span className="text-sm text-stone-700">{opt}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    const next = checked
                      ? arrVal.filter((v) => v !== opt)
                      : [...arrVal, opt];
                    onChange(next);
                  }}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Client Timeline (editable) ──
function ClientTimeline({ event, onUpdate }: { event: Event; onUpdate: (schedule: ScheduleItem[]) => void }) {
  const schedule = [...(event.schedule ?? [])].sort((a, b) => a.time.localeCompare(b.time));
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timeVal, setTimeVal] = useState("");
  const [titleVal, setTitleVal] = useState("");
  const [notesVal, setNotesVal] = useState("");

  function resetForm() {
    setTimeVal("");
    setTitleVal("");
    setNotesVal("");
  }

  function startAdd() {
    resetForm();
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(item: ScheduleItem) {
    setEditingId(item.id);
    setAdding(false);
    setTimeVal(item.time);
    setTitleVal(item.title);
    setNotesVal(item.notes);
  }

  function save() {
    if (!titleVal.trim() || !timeVal) return;
    const raw = event.schedule ?? [];
    if (editingId) {
      onUpdate(raw.map((s) => s.id === editingId ? { ...s, time: timeVal, title: titleVal.trim(), notes: notesVal } : s));
      setEditingId(null);
    } else {
      onUpdate([...raw, { id: crypto.randomUUID(), time: timeVal, title: titleVal.trim(), notes: notesVal }]);
      setAdding(false);
    }
    resetForm();
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    resetForm();
  }

  function remove(id: string) {
    onUpdate((event.schedule ?? []).filter((s) => s.id !== id));
    if (editingId === id) cancel();
  }

  const showForm = adding || editingId !== null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-violet-400" />
          <h2 className="font-heading font-semibold text-stone-800">Day Timeline</h2>
        </div>
        {!showForm && (
          <button onClick={startAdd} className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors">
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-stone-100 bg-violet-50/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Time *</label>
              <input
                type="time"
                value={timeVal}
                onChange={(e) => setTimeVal(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Title *</label>
              <input
                type="text"
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                placeholder="e.g. Ceremony Begins"
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
            <input
              type="text"
              value={notesVal}
              onChange={(e) => setNotesVal(e.target.value)}
              placeholder="Optional details..."
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 outline-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={save} className="text-xs font-medium bg-violet-500 text-white px-4 py-2 rounded-lg hover:bg-violet-600 transition-colors">
              {editingId ? "Save" : "Add"}
            </button>
            <button onClick={cancel} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="px-5 py-4 relative">
        {schedule.length === 0 && !showForm ? (
          <div className="text-center py-6">
            <p className="text-sm text-stone-400">No schedule yet.</p>
          </div>
        ) : schedule.length > 0 ? (
          <>
            <div className="absolute left-[calc(1.25rem+80px)] top-4 bottom-4 w-px bg-stone-100" />
            <div className="space-y-1">
              {schedule.map((item, idx) => (
                <div key={item.id} className="flex gap-5 py-2.5 group">
                  <div className="w-20 shrink-0 text-right pt-0.5">
                    <span className="text-xs font-semibold text-stone-400 tracking-wide whitespace-nowrap">
                      {fmt12(item.time)}
                    </span>
                  </div>
                  <div className="relative shrink-0" style={{ width: 0 }}>
                    <div className={`w-2.5 h-2.5 rounded-full border-2 border-white z-10 mt-1 -ml-1.5 ${
                      idx === 0 ? "bg-rose-400 shadow-sm shadow-rose-200" : "bg-stone-300"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-sm font-semibold leading-snug ${idx === 0 ? "text-stone-900" : "text-stone-700"}`}>
                          {item.title}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{item.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        <button onClick={() => startEdit(item)} className="text-stone-400 hover:text-stone-600 p-1" aria-label="Edit">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => remove(item.id)} className="text-stone-400 hover:text-red-500 p-1" aria-label="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Client Color Palette (editable) ──
function ClientColorPalette({ event, onUpdate }: { event: Event; onUpdate: (colors: string[]) => void }) {
  const colors = event.colorPalette ?? [];
  const [adding, setAdding] = useState(false);
  const [newColor, setNewColor] = useState("#d4a5a5");

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-rose-300 via-violet-300 to-amber-300" />
          <h2 className="font-heading font-semibold text-stone-800 text-sm">Color Palette</h2>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      {colors.length === 0 && !adding ? (
        <p className="text-sm text-stone-400">No colors added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2.5 items-center">
          {colors.map((color, i) => (
            <div key={i} className="text-center group relative">
              <div
                className="w-10 h-10 rounded-xl ring-1 ring-stone-200 shadow-sm"
                style={{ backgroundColor: color }}
              />
              <button
                onClick={() => onUpdate(colors.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                aria-label="Remove color"
              >
                <X size={10} />
              </button>
              <p className="text-[9px] text-stone-400 mt-1 font-mono">{color}</p>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-24 border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
          <button
            onClick={() => {
              if (newColor) {
                onUpdate([...colors, newColor]);
                setNewColor("#d4a5a5");
                setAdding(false);
              }
            }}
            className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-lg hover:bg-rose-500 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Client Guest RSVP ──
const RSVP_COLORS: Record<RsvpStatus, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-600 border-emerald-200",
  declined: "bg-red-50 text-red-500 border-red-200",
};

function ClientBudget({ event, onUpdate }: { event: Event; onUpdate: (budget: BudgetItem[]) => void }) {
  const items = event.budget ?? [];
  const vendorList = event.vendors ?? [];
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "Venue", allocated: "", notes: "" });

  const totalAlloc = items.reduce((s, b) => s + b.allocated, 0);
  const totalCommitted = vendorList.reduce((s, v) => s + (v.contractTotal ?? 0), 0);
  const remaining = totalAlloc - totalCommitted;

  function getCommitted(budgetCategory: string): number {
    return vendorList
      .filter((v) => VENDOR_TO_BUDGET_CATEGORY[v.category] === budgetCategory)
      .reduce((sum, v) => sum + (v.contractTotal ?? 0), 0);
  }

  function startAdd() {
    const usedCategories = items.map((b) => b.category);
    const nextCategory = BUDGET_CATEGORIES.find((c) => !usedCategories.includes(c)) || "Other";
    setForm({ category: nextCategory, allocated: "", notes: "" });
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(item: BudgetItem) {
    setForm({ category: item.category, allocated: String(item.allocated), notes: item.notes });
    setEditingId(item.id);
    setAdding(false);
  }

  function save() {
    if (!form.category || !form.allocated) return;
    const allocated = parseFloat(form.allocated);
    if (isNaN(allocated) || allocated < 0) return;
    if (editingId) {
      onUpdate(items.map((b) => b.id === editingId ? { ...b, category: form.category, allocated, notes: form.notes.trim() } : b));
      setEditingId(null);
    } else {
      onUpdate([...items, { id: crypto.randomUUID(), category: form.category, allocated, notes: form.notes.trim() }]);
      setAdding(false);
    }
    setForm({ category: "Venue", allocated: "", notes: "" });
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setForm({ category: "Venue", allocated: "", notes: "" });
  }

  function remove(id: string) {
    onUpdate(items.filter((b) => b.id !== id));
    if (editingId === id) cancel();
  }

  const showForm = adding || editingId !== null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Wallet size={15} className="text-emerald-500" />
          <h2 className="font-heading font-semibold text-stone-800">Budget</h2>
          {items.length > 0 && <span className="text-xs text-stone-400 ml-1">({fmtCurrency(totalAlloc)})</span>}
        </div>
        {!showForm && (
          <button onClick={startAdd} className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors">
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-stone-100 bg-stone-50/50">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Budget</p>
            <p className="text-sm font-heading font-bold text-stone-800 mt-0.5">{fmtCurrency(totalAlloc)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Committed</p>
            <p className="text-sm font-heading font-bold text-stone-800 mt-0.5">{fmtCurrency(totalCommitted)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Remaining</p>
            <p className={`text-sm font-heading font-bold mt-0.5 ${remaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtCurrency(remaining)}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="px-5 py-4 border-b border-stone-100 bg-rose-50/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              >
                {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Amount</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form.allocated}
                onChange={(e) => setForm({ ...form, allocated: e.target.value })}
                placeholder="0.00"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={save} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-lg hover:bg-rose-500 transition-colors">
              {editingId ? "Save" : "Add"}
            </button>
            <button onClick={cancel} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <div className="px-5 py-8 text-center">
          <Wallet size={20} className="text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-400">No budget items yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {items.map((item) => {
            const committed = getCommitted(item.category);
            const pct = item.allocated > 0 ? Math.min((committed / item.allocated) * 100, 100) : 0;
            const over = committed > item.allocated;
            return (
              <div key={item.id} className="px-5 py-3.5 group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-stone-700">{item.category}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-stone-400">{fmtCurrency(committed)} / {fmtCurrency(item.allocated)}</span>
                    <span className={`font-semibold ${over ? "text-red-500" : "text-emerald-600"}`}>
                      {over ? `-${fmtCurrency(committed - item.allocated)} over` : fmtCurrency(item.allocated - committed) + " left"}
                    </span>
                    <button onClick={() => startEdit(item)} className="sm:opacity-0 sm:group-hover:opacity-100 text-stone-400 hover:text-stone-600 transition-all p-1" aria-label="Edit">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => remove(item.id)} className="sm:opacity-0 sm:group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all p-1" aria-label="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${over ? "bg-red-400" : pct > 80 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                {item.notes && <p className="text-[10px] text-stone-400 mt-1">{item.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Client Audit Helper ──
async function logClientAudit(shareToken: string, eventId: string, contractId: string, action: string, metadata?: Record<string, unknown>) {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareToken, eventId, contractId, action, metadata }),
    });
  } catch { /* best-effort — don't block signing flow */ }
}

// ── Client Contract Card ──
function ClientContractsSection({ event, updateEvent }: { event: Event; updateEvent: (id: string, data: Partial<Event>) => void }) {
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const contracts = event.contracts ?? [];

  function handleClientDisclosureAccepted() {
    if (!signingContractId || !event.shareToken) return;
    const now = new Date().toISOString();
    const updated = contracts.map((c) =>
      c.id === signingContractId
        ? { ...c, clientDisclosureAcceptedAt: now }
        : c
    );
    updateEvent(event.id, { contracts: updated });
    logClientAudit(event.shareToken, event.id, signingContractId, "disclosure_accepted");
  }

  async function handleClientSign(signature: string, signedName: string) {
    if (!signingContractId) return;
    const contractName = contracts.find((c) => c.id === signingContractId)?.name;
    let storageClientSigPath: string | null = null;
    // Try to upload signature PNG to Storage via API
    if (event.shareToken) {
      try {
        const sigBlob = await (await fetch(signature)).blob();
        const sigPath = `${event.id}/contracts/${signingContractId}/client-signature.png`;
        storageClientSigPath = await uploadClientFile(event.shareToken, "event-files", sigPath, sigBlob);
      } catch {
        // Fall through — keep base64 signature as fallback
      }
    }
    const updated = contracts.map((c) =>
      c.id === signingContractId
        ? {
            ...c,
            clientSignature: signature,
            clientSignedAt: new Date().toISOString(),
            clientSignedName: signedName,
            ...(storageClientSigPath ? { storageClientSig: storageClientSigPath } : {}),
          }
        : c
    );
    updateEvent(event.id, { contracts: updated });
    if (event.shareToken) {
      logClientAudit(event.shareToken, event.id, signingContractId, "signature_applied", { actorName: signedName, contractName });
    }
    setSigningContractId(null);
  }

  async function handleUploadSigned(contractId: string, file: File) {
    try {
      // Try Storage upload via API first
      if (event.shareToken) {
        try {
          const sigPath = `${event.id}/contracts/${contractId}/signed-${file.name}`;
          const resolvedSigPath = await uploadClientFile(event.shareToken, "event-files", sigPath, file);
          const signedUrl = await getClientSignedUrl(event.shareToken, "event-files", resolvedSigPath);
          const updated = contracts.map((c) =>
            c.id === contractId
              ? {
                  ...c,
                  signedFileData: signedUrl,
                  signedFileName: file.name,
                  signedAt: new Date().toISOString(),
                  storageSignedPath: resolvedSigPath,
                }
              : c
          );
          updateEvent(event.id, { contracts: updated });
          return;
        } catch {
          // Fall through to base64 fallback
        }
      }
      // Fallback: base64 (legacy behavior)
      const result = await readPdfAsBase64(file);
      const updated = contracts.map((c) =>
        c.id === contractId
          ? { ...c, signedFileData: result.dataUrl, signedFileName: result.fileName, signedAt: new Date().toISOString() }
          : c
      );
      updateEvent(event.id, { contracts: updated });
    } catch {
      // silently fail
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={18} className="text-teal-500" />
        <h2 className="font-heading font-semibold text-stone-800">Contracts</h2>
        <span className="text-xs text-stone-400 ml-1">({contracts.length})</span>
      </div>
      <div className="space-y-3">
        {contracts.map((contract) => (
          <ClientContractCard
            key={contract.id}
            contract={contract}
            shareToken={event.shareToken}
            onSign={() => setSigningContractId(contract.id)}
            onUploadSigned={(file) => handleUploadSigned(contract.id, file)}
          />
        ))}
      </div>
      <SignaturePad
        open={!!signingContractId}
        title="Sign Contract"
        onSign={handleClientSign}
        onCancel={() => setSigningContractId(null)}
        onDisclosureAccepted={handleClientDisclosureAccepted}
      />
    </div>
  );
}

function ClientContractCard({
  contract,
  shareToken,
  onSign,
  onUploadSigned,
}: {
  contract: EventContract;
  shareToken: string;
  onSign: () => void;
  onUploadSigned: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plannerSigned = !!contract.plannerSignature;
  const clientSigned = !!contract.clientSignature;

  // Resolve signed URLs for storage-backed signatures
  const [plannerSigUrl, setPlannerSigUrl] = useState<string | null>(null);
  const [clientSigUrl, setClientSigUrl] = useState<string | null>(null);

  useEffect(() => {
    if (contract.storagePlannerSig && shareToken) {
      getClientSignedUrl(shareToken, "event-files", contract.storagePlannerSig)
        .then(setPlannerSigUrl)
        .catch(() => {}); // fall back to inline data
    }
    if (contract.storageClientSig && shareToken) {
      getClientSignedUrl(shareToken, "event-files", contract.storageClientSig)
        .then(setClientSigUrl)
        .catch(() => {}); // fall back to inline data
    }
  }, [contract.storagePlannerSig, contract.storageClientSig, shareToken]);

  async function handleStorageDownload(storagePath: string, fileName: string) {
    try {
      const url = await getClientSignedUrl(shareToken, "event-files", storagePath);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch {
      // If signed URL fails and we have base64 data, fall back
      if (contract.fileData && contract.fileData.startsWith("data:")) {
        downloadBase64File(contract.fileData, fileName);
      }
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/30 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <FileText size={14} className="text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800">{contract.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                contract.type === "planner" ? "bg-rose-50 text-rose-500" : "bg-teal-50 text-teal-600"
              }`}>
                {contract.type === "planner" ? "Planner Contract" : contract.vendorName || "Vendor"}
              </span>
              <span className="text-[10px] text-stone-400">{formatBytes(contract.fileSize)}</span>
              {plannerSigned && clientSigned && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium flex items-center gap-1">
                  <Check size={9} /> Fully Signed
                </span>
              )}
              {(plannerSigned || clientSigned) && !(plannerSigned && clientSigned) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium flex items-center gap-1">
                  <PenTool size={9} /> Partially Signed
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-11 sm:ml-0">
          <button
            onClick={() => {
              if (contract.storagePath) {
                handleStorageDownload(contract.storagePath, contract.fileName);
              } else {
                downloadBase64File(contract.fileData, contract.fileName);
              }
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-teal-500 px-2 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <Download size={12} />
            Download
          </button>
          {contract.signedFileData && contract.signedFileName ? (
            <button
              onClick={() => {
                if (contract.storageSignedPath) {
                  handleStorageDownload(contract.storageSignedPath, contract.signedFileName!);
                } else {
                  downloadBase64File(contract.signedFileData!, contract.signedFileName!);
                }
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-emerald-500 hover:text-emerald-600 px-2 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <UserCheck size={12} />
              Signed Copy
            </button>
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-stone-600 px-2 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <Upload size={12} />
                Upload PDF
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadSigned(file);
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Signature area */}
      <div className="border-t border-stone-200 px-3 py-3 bg-white/50">
        <div className="grid grid-cols-2 gap-3">
          {/* Planner signature (read-only for client) */}
          <div className="rounded-lg border border-stone-100 bg-white p-2.5">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-1.5">Planner</p>
            {plannerSigned ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={plannerSigUrl || contract.plannerSignature!} alt="Planner signature" className="h-10 object-contain mb-1" />
                <p className="text-[11px] font-medium text-stone-600">{contract.plannerSignedName}</p>
                <p className="text-[10px] text-stone-400">
                  {new Date(contract.plannerSignedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-stone-300 italic py-2">Not yet signed</p>
            )}
          </div>

          {/* Client signature */}
          <div className="rounded-lg border border-stone-100 bg-white p-2.5">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-1.5">Client</p>
            {clientSigned ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clientSigUrl || contract.clientSignature!} alt="Client signature" className="h-10 object-contain mb-1" />
                <p className="text-[11px] font-medium text-stone-600">{contract.clientSignedName}</p>
                <p className="text-[10px] text-stone-400">
                  {new Date(contract.clientSignedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            ) : (
              <button
                onClick={onSign}
                className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors w-full justify-center border border-dashed border-rose-200 mt-1"
              >
                <PenTool size={12} />
                Sign Contract
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientGuestRSVP({ event, onUpdate }: { event: Event; onUpdate: (guests: Guest[]) => void }) {
  const guests = event.guests ?? [];
  const [collapsed, setCollapsed] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [rsvpVal, setRsvpVal] = useState<RsvpStatus>("pending");
  const [nameVal, setNameVal] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [mealVal, setMealVal] = useState("");
  const [dietaryVal, setDietaryVal] = useState("");
  const [plusOneVal, setPlusOneVal] = useState(false);
  const [plusOneNameVal, setPlusOneNameVal] = useState("");

  // CSV import state & meals view
  const [showImport, setShowImport] = useState(false);
  const [showMeals, setShowMeals] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<Guest, "id">[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");

  const accepted = guests.filter((g) => g.rsvp === "accepted").length;
  const pending = guests.filter((g) => g.rsvp === "pending").length;

  // ── CSV parsing ──
  function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let current = "";
    let inQuotes = false;
    let row: string[] = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { row.push(current.trim()); current = ""; }
        else if (ch === "\n" || (ch === "\r" && next === "\n")) {
          row.push(current.trim()); current = "";
          if (row.some((c) => c !== "")) rows.push(row);
          row = [];
          if (ch === "\r") i++;
        } else { current += ch; }
      }
    }
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
      if (rows.length === 0) { setImportErrors(["The file appears to be empty."]); setImportPreview([]); return; }

      const errors: string[] = [];
      const parsed: Omit<Guest, "id">[] = [];
      const firstRow = rows[0].map(normalizeHeader);
      const knownHeaders = ["name", "email", "rsvp", "mealchoice", "meal", "table", "tableassignment", "plusone", "plusonename", "dietarynotes", "dietary", "notes", "firstname", "lastname", "first", "last", "fullname"];
      const hasHeaders = firstRow.some((h) => knownHeaders.includes(h));
      const headerMap: Record<string, number> = {};
      let dataRows = rows;
      if (hasHeaders) { dataRows = rows.slice(1); firstRow.forEach((h, i) => { headerMap[h] = i; }); }

      function getCol(row: string[], ...names: string[]): string {
        if (hasHeaders) {
          for (const n of names) { const idx = headerMap[normalizeHeader(n)]; if (idx !== undefined && row[idx]) return row[idx]; }
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
          const firstName = getCol(row, "first name", "firstname", "first");
          const lastName = getCol(row, "last name", "lastname", "last");
          name = (firstName || lastName) ? [firstName, lastName].filter(Boolean).join(" ") : getCol(row, "name", "full name", "fullname", "guest name", "guestname", "guest");
          email = getCol(row, "email", "email address", "emailaddress");
          const rsvpVal = getCol(row, "rsvp", "rsvp status", "status").toLowerCase();
          if (["accepted", "yes", "confirmed", "attending"].includes(rsvpVal)) rsvp = "accepted";
          else if (["declined", "no", "not attending"].includes(rsvpVal)) rsvp = "declined";
          mealChoice = getCol(row, "meal choice", "mealchoice", "meal", "entree", "dinner");
          tableAssignment = getCol(row, "table", "table assignment", "tableassignment", "table number", "tablenumber", "seating");
          const plusOneStr = getCol(row, "plus one", "plusone", "plus 1", "guest").toLowerCase();
          plusOne = ["yes", "true", "1", "y"].includes(plusOneStr);
          plusOneName = getCol(row, "plus one name", "plusonename", "plus 1 name", "guest name");
          dietaryNotes = getCol(row, "dietary notes", "dietarynotes", "dietary", "allergies", "restrictions", "notes", "dietary restrictions");
        } else {
          name = row[0] || "";
          email = row[1] || "";
        }

        if (!name) { errors.push(`Row ${rowIdx + (hasHeaders ? 2 : 1)}: Missing name, skipped.`); return; }
        parsed.push({ name, email, rsvp, mealChoice, tableAssignment, plusOne, plusOneName, dietaryNotes, group: "", vip: false });
      });

      if (parsed.length === 0) errors.push("No valid guests found in file.");
      setImportPreview(parsed);
      setImportErrors(errors);
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (importPreview.length === 0) return;
    const newGuests: Guest[] = importPreview.map((g) => ({ id: crypto.randomUUID(), ...g }));
    onUpdate([...guests, ...newGuests]);
    cancelImport();
  }

  function cancelImport() {
    setShowImport(false);
    setImportPreview([]);
    setImportErrors([]);
    setImportFileName("");
  }

  function exportCSV() {
    const headers = ["Name", "Email", "RSVP", "Meal Choice", "Dietary Notes", "Table", "Plus One", "Plus One Name"];
    const rows = guests.map((g) => [
      g.name, g.email, g.rsvp, g.mealChoice, g.dietaryNotes,
      g.tableAssignment, g.plusOne ? "Yes" : "No", g.plusOneName,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.name} - Guest List.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Meal & dietary summary
  const mealCounts: Record<string, number> = {};
  const dietaryList: { name: string; notes: string }[] = [];
  guests.forEach((g) => {
    if (g.mealChoice) mealCounts[g.mealChoice] = (mealCounts[g.mealChoice] || 0) + 1;
    if (g.dietaryNotes) dietaryList.push({ name: g.name, notes: g.dietaryNotes });
  });
  const hasMealData = Object.keys(mealCounts).length > 0 || dietaryList.length > 0;

  function resetForm() {
    setNameVal("");
    setEmailVal("");
    setRsvpVal("pending");
    setMealVal("");
    setDietaryVal("");
    setPlusOneVal(false);
    setPlusOneNameVal("");
  }

  function startAdd() {
    resetForm();
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(g: Guest) {
    setEditingId(g.id);
    setAdding(false);
    setNameVal(g.name);
    setEmailVal(g.email);
    setRsvpVal(g.rsvp);
    setMealVal(g.mealChoice);
    setDietaryVal(g.dietaryNotes);
    setPlusOneVal(g.plusOne);
    setPlusOneNameVal(g.plusOneName);
  }

  function save() {
    if (!nameVal.trim()) return;
    if (editingId) {
      onUpdate(guests.map((g) =>
        g.id === editingId
          ? { ...g, name: nameVal.trim(), email: emailVal.trim(), rsvp: rsvpVal, mealChoice: mealVal, dietaryNotes: dietaryVal, plusOne: plusOneVal, plusOneName: plusOneNameVal }
          : g
      ));
      setEditingId(null);
    } else {
      const newGuest: Guest = {
        id: crypto.randomUUID(),
        name: nameVal.trim(),
        email: emailVal.trim(),
        rsvp: rsvpVal,
        mealChoice: mealVal,
        tableAssignment: "",
        plusOne: plusOneVal,
        plusOneName: plusOneNameVal,
        dietaryNotes: dietaryVal,
        group: "",
        vip: false,
      };
      onUpdate([...guests, newGuest]);
      setAdding(false);
    }
    resetForm();
  }

  function cancel() {
    setEditingId(null);
    setAdding(false);
    resetForm();
  }

  function remove(id: string) {
    onUpdate(guests.filter((g) => g.id !== id));
    if (editingId === id) cancel();
  }

  function renderForm(isEdit: boolean, guestName?: string) {
    return (
      <div className="space-y-3">
        {isEdit ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-800">{guestName}</span>
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Name *</label>
            <input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              placeholder="Guest name"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Email</label>
            <input
              type="email"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              placeholder="email@example.com"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">RSVP</label>
          <div className="flex gap-1.5">
            {(["accepted", "declined", "pending"] as RsvpStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setRsvpVal(status)}
                className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  rsvpVal === status
                    ? RSVP_COLORS[status]
                    : "border-stone-200 text-stone-400 hover:border-stone-300"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Meal Choice</label>
            <input
              value={mealVal}
              onChange={(e) => setMealVal(e.target.value)}
              placeholder="e.g. Chicken, Fish"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Dietary Notes</label>
            <input
              value={dietaryVal}
              onChange={(e) => setDietaryVal(e.target.value)}
              placeholder="Allergies…"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlusOneVal(!plusOneVal)}
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
              plusOneVal ? "border-violet-400 bg-violet-400" : "border-stone-300"
            }`}
          >
            {plusOneVal && <Check size={10} className="text-white" />}
          </button>
          <span className="text-xs text-stone-600">Plus one</span>
        </div>
        {plusOneVal && (
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Plus One Name</label>
            <input
              value={plusOneNameVal}
              onChange={(e) => setPlusOneNameVal(e.target.value)}
              placeholder="Guest name"
              className="w-full sm:w-1/2 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={save} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-lg hover:bg-rose-500 transition-colors">
            {isEdit ? "Save" : "Add Guest"}
          </button>
          <button onClick={cancel} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-5 pt-5 pb-4 border-b border-stone-100 text-left hover:bg-stone-50/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-amber-400" />
            <h2 className="font-heading font-semibold text-stone-800">Guest List & RSVP</h2>
            <span className="text-xs text-stone-400">({guests.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span><span className="font-semibold text-emerald-600">{accepted}</span> <span className="hidden sm:inline">accepted</span><span className="sm:hidden">✓</span></span>
              <span><span className="font-semibold text-amber-600">{pending}</span> <span className="hidden sm:inline">pending</span><span className="sm:hidden">…</span></span>
            </div>
            <ChevronDown size={16} className={`text-stone-400 transition-transform ${!collapsed ? "rotate-180" : ""}`} />
          </div>
        </div>
      </button>

      {!collapsed && <>
      {!adding && editingId === null && (
        <div className="flex items-center gap-2 px-5 pt-3 pb-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors" title="Import CSV">
            <Upload size={13} /> Import
          </button>
          {guests.length > 0 && (
            <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors" title="Export CSV">
              <Download size={13} /> Export
            </button>
          )}
          <div className="flex-1" />
          <button onClick={startAdd} className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors">
            <Plus size={14} /> Add Guest
          </button>
        </div>
      )}

      {adding && (
        <div className="px-5 py-4 border-b border-stone-100 bg-rose-50/30">
          {renderForm(false)}
        </div>
      )}

      {/* Meals & Dietary Summary */}
      {guests.length > 0 && hasMealData && (
        <div className="border-b border-stone-100">
          <button
            onClick={() => setShowMeals(!showMeals)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={13} className="text-orange-400" />
              <span className="text-xs font-medium text-stone-600">Meals & Dietary</span>
              {dietaryList.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                  <AlertTriangle size={9} />
                  {dietaryList.length} restriction{dietaryList.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <ChevronDown size={14} className={`text-stone-400 transition-transform ${showMeals ? "rotate-180" : ""}`} />
          </button>

          {showMeals && (
            <div className="px-5 pb-4 space-y-3">
              {/* Meal counts */}
              {Object.keys(mealCounts).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">Meal Choices</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(mealCounts).sort((a, b) => b[1] - a[1]).map(([meal, count]) => (
                      <span key={meal} className="text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 font-medium">
                        {meal} <span className="text-orange-400 ml-0.5">({count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary restrictions */}
              {dietaryList.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-2">Dietary Restrictions</p>
                  <div className="space-y-1.5">
                    {dietaryList.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertTriangle size={11} className="text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-stone-700">
                          <span className="font-medium">{d.name}</span>
                          <span className="text-stone-400"> — </span>
                          <span className="italic">{d.notes}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {guests.length === 0 && !adding ? (
        <div className="px-5 py-8 text-center">
          <Users size={20} className="text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-400">No guests yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {guests.map((guest) => (
            <div key={guest.id} className="px-5 py-4">
              {editingId === guest.id ? (
                renderForm(true, guest.name)
              ) : (
                <div
                  className="flex items-center justify-between cursor-pointer group"
                  onClick={() => startEdit(guest)}
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
                    {(guest.mealChoice || guest.dietaryNotes) && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                        {guest.mealChoice && (
                          <span className="flex items-center gap-1">
                            <UtensilsCrossed size={10} className="text-orange-300" />
                            {guest.mealChoice}
                          </span>
                        )}
                        {guest.dietaryNotes && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <AlertTriangle size={10} />
                            <span className="italic">{guest.dietaryNotes}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${RSVP_COLORS[guest.rsvp].split(" ").slice(0, 2).join(" ")}`}>
                      {guest.rsvp}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(guest.id); }}
                      className="sm:opacity-0 sm:group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all p-1"
                      aria-label="Remove guest"
                    >
                      <Trash2 size={13} />
                    </button>
                    <span className="text-[10px] text-stone-300 hidden sm:inline">tap to edit</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      </>}

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={cancelImport}>
          <div className="absolute inset-0 bg-stone-900/30" />
          <div
            className="relative bg-white sm:rounded-2xl rounded-t-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Upload size={16} className="text-emerald-500" />
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

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
              {importPreview.length === 0 && (
                <>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-2xl p-8 sm:p-10 cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-colors">
                    <Upload size={28} className="text-stone-300 mb-3" />
                    <p className="text-sm font-medium text-stone-600">Click to upload a CSV file</p>
                    <p className="text-xs text-stone-400 mt-1">or drag and drop</p>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCSVFile(file); }}
                    />
                  </label>
                  <div className="mt-4 bg-stone-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-stone-600 mb-2">Supported formats:</p>
                    <ul className="text-xs text-stone-500 space-y-1.5">
                      <li className="flex items-start gap-1.5"><Check size={11} className="text-emerald-500 mt-0.5 shrink-0" /><span><strong>With headers:</strong> Name, Email, RSVP, Meal Choice, Table, Plus One, Dietary Notes</span></li>
                      <li className="flex items-start gap-1.5"><Check size={11} className="text-emerald-500 mt-0.5 shrink-0" /><span><strong>First/Last name:</strong> Columns auto-merged</span></li>
                      <li className="flex items-start gap-1.5"><Check size={11} className="text-emerald-500 mt-0.5 shrink-0" /><span><strong>Simple list:</strong> Just names (one per row)</span></li>
                      <li className="flex items-start gap-1.5"><Check size={11} className="text-emerald-500 mt-0.5 shrink-0" /><span><strong>RSVP values:</strong> accepted/yes/confirmed, declined/no, pending</span></li>
                    </ul>
                  </div>
                </>
              )}

              {importErrors.length > 0 && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">{importErrors.length} warning{importErrors.length !== 1 ? "s" : ""}</p>
                  <ul className="text-xs text-amber-600 space-y-0.5">
                    {importErrors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                    {importErrors.length > 5 && <li>...and {importErrors.length - 5} more</li>}
                  </ul>
                </div>
              )}

              {importPreview.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-stone-800">{importPreview.length} guest{importPreview.length !== 1 ? "s" : ""} ready to import</p>
                      <p className="text-[11px] text-stone-400">from {importFileName}</p>
                    </div>
                    <button onClick={() => { setImportPreview([]); setImportErrors([]); setImportFileName(""); }} className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors">
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
                            <th className="text-left px-3 py-2 font-medium text-stone-500">+1</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {importPreview.map((g, i) => (
                            <tr key={i} className="hover:bg-stone-50/50">
                              <td className="px-3 py-2 text-stone-400">{i + 1}</td>
                              <td className="px-3 py-2 text-stone-800 font-medium">{g.name}</td>
                              <td className="px-3 py-2 text-stone-500">{g.email || "—"}</td>
                              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${RSVP_COLORS[g.rsvp]}`}>{g.rsvp}</span></td>
                              <td className="px-3 py-2 text-stone-500">{g.mealChoice || "—"}</td>
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

            {importPreview.length > 0 && (
              <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-stone-100 bg-stone-50/50">
                <button onClick={cancelImport} className="text-xs text-stone-400 hover:text-stone-600 px-4 py-2 rounded-xl hover:bg-stone-100 transition-colors">Cancel</button>
                <button onClick={confirmImport} className="flex items-center gap-1.5 text-xs font-medium bg-emerald-500 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                  <Check size={13} />
                  Import {importPreview.length} Guest{importPreview.length !== 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
