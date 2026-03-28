"use client";

import { useParams } from "next/navigation";
import { useEvent, useStoreActions, useQuestionnaires, usePlannerProfile } from "@/hooks/useStore";
import Link from "next/link";
import { useState, useRef } from "react";
import { Calendar, MapPin, FileText, CheckSquare, Check, Circle, Clock, Layout, ClipboardList, ChevronDown, ChevronUp, CheckCircle2, Receipt, Users, Wallet, Search, Phone, Globe, Download, Upload, UserCheck, PenTool } from "lucide-react";
import { Question, Invoice, Event, Guest, RsvpStatus, Message, BudgetItem, VENDOR_TO_BUDGET_CATEGORY, Vendor, VendorCategory, EventContract } from "@/lib/types";
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

const INV_STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-100 text-stone-500",
  sent: "bg-blue-50 text-blue-600",
  paid: "bg-emerald-50 text-emerald-600",
};

export default function ClientPortalPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const { updateEvent } = useStoreActions();
  const allQuestionnaires = useQuestionnaires();
  const profile = usePlannerProfile();
  const [openQId, setOpenQId] = useState<string | null>(null);


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

  const schedule = [...(event.schedule ?? [])].sort((a, b) => a.time.localeCompare(b.time));
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

        {/* Mood Board */}
        {(event.moodBoard ?? []).length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-stone-100">
              <span className="text-pink-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </span>
              <h2 className="font-heading font-semibold text-stone-800">Mood Board</h2>
            </div>
            <div className="p-4">
              <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                {(event.moodBoard ?? []).map((img) => (
                  <div key={img.id} className="break-inside-avoid">
                    <img
                      src={img.thumb || img.url}
                      alt={img.caption}
                      className="w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                    {img.caption && (
                      <p className="text-[10px] text-stone-400 mt-1 truncate">{img.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Day Timeline — editable */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-violet-400" />
              <h2 className="font-heading font-semibold text-stone-800">Day Timeline</h2>
            </div>
          </div>
          <div className="px-5 py-4 relative">
            {schedule.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-stone-400">No schedule yet.</p>
              </div>
            ) : (
              <>
                <div className="absolute left-[calc(1.25rem+80px)] top-4 bottom-4 w-px bg-stone-100" />
                <div className="space-y-1">
                  {schedule.map((item, idx) => (
                      <div key={item.id} className="flex gap-5 py-2.5">
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
                          <p className={`text-sm font-semibold leading-snug ${idx === 0 ? "text-stone-900" : "text-stone-700"}`}>
                            {item.title}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{item.notes}</p>
                          )}
                        </div>
                      </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

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
            href={`/client/${event.id}/files`}
            className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
          >
            <FileText size={22} className="text-blue-400 mb-2" />
            <h3 className="font-heading font-semibold text-stone-800 group-hover:text-blue-500 text-sm">Files</h3>
            <p className="text-xs text-stone-400 mt-1">{(event.files ?? []).length} shared files</p>
          </Link>
        </div>

        {/* To Do List — client can toggle completion */}
        {todos.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-emerald-400" />
                <h2 className="font-heading font-semibold text-stone-800">Planning Progress</h2>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                {completedCount}/{todos.length} complete
              </span>
            </div>

            {/* Progress bar */}
            <div className="px-5 pt-3 pb-1">
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${todos.length ? (completedCount / todos.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="px-5 py-3 space-y-0.5">
              {todos.map((item) => (
                <button
                  key={item.id}
                  className="flex items-center gap-3 py-2 w-full text-left hover:bg-stone-50 rounded-lg px-1 -mx-1 transition-colors"
                  onClick={() => {
                    const updated = (event.timeline ?? []).map((t) =>
                      t.id === item.id ? { ...t, completed: !t.completed } : t
                    );
                    updateEvent(eventId, { timeline: updated });
                  }}
                >
                  {item.completed ? (
                    <Check size={14} className="text-emerald-500 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-stone-300 shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${item.completed ? "line-through text-stone-400" : "text-stone-700"}`}>
                    {item.title}
                  </span>
                  {item.dueDate && (
                    <span className="text-xs text-stone-400 shrink-0">
                      {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

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
          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
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

// ── Client Color Palette ──
function ClientColorPalette({ event }: { event: Event; onUpdate?: (colors: string[]) => void }) {
  const colors = event.colorPalette ?? [];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-rose-300 via-violet-300 to-amber-300" />
          <h2 className="font-heading font-semibold text-stone-800 text-sm">Color Palette</h2>
        </div>
      </div>

      {colors.length === 0 ? (
        <p className="text-sm text-stone-400">No colors added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2.5 items-center">
          {colors.map((color, i) => (
            <div key={i} className="text-center">
              <div
                className="w-10 h-10 rounded-xl ring-1 ring-stone-200 shadow-sm"
                style={{ backgroundColor: color }}
              />
              <p className="text-[9px] text-stone-400 mt-1 font-mono">{color}</p>
            </div>
          ))}
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

function ClientBudget({ event }: { event: Event; onUpdate?: (budget: BudgetItem[]) => void }) {
  const items = event.budget ?? [];
  const vendorList = event.vendors ?? [];

  const totalAlloc = items.reduce((s, b) => s + b.allocated, 0);
  const totalCommitted = vendorList.reduce((s, v) => s + (v.contractTotal ?? 0), 0);
  const remaining = totalAlloc - totalCommitted;

  function getCommitted(budgetCategory: string): number {
    return vendorList
      .filter((v) => VENDOR_TO_BUDGET_CATEGORY[v.category] === budgetCategory)
      .reduce((sum, v) => sum + (v.contractTotal ?? 0), 0);
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Wallet size={15} className="text-emerald-500" />
          <h2 className="font-heading font-semibold text-stone-800">Budget</h2>
          {items.length > 0 && <span className="text-xs text-stone-400 ml-1">({fmtCurrency(totalAlloc)})</span>}
        </div>
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

      {items.length === 0 ? (
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
              <div
                key={item.id}
                className="px-5 py-3.5"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-stone-700">{item.category}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-stone-400">{fmtCurrency(committed)} / {fmtCurrency(item.allocated)}</span>
                    <span className={`font-semibold ${over ? "text-red-500" : "text-emerald-600"}`}>
                      {over ? `-${fmtCurrency(committed - item.allocated)} over` : fmtCurrency(item.allocated - committed) + " left"}
                    </span>
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

// ── Client Contract Card ──
function ClientContractsSection({ event, updateEvent }: { event: Event; updateEvent: (id: string, data: Partial<Event>) => void }) {
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const contracts = event.contracts ?? [];

  function handleClientSign(signature: string, signedName: string) {
    if (!signingContractId) return;
    const updated = contracts.map((c) =>
      c.id === signingContractId
        ? { ...c, clientSignature: signature, clientSignedAt: new Date().toISOString(), clientSignedName: signedName }
        : c
    );
    updateEvent(event.id, { contracts: updated });
    setSigningContractId(null);
  }

  async function handleUploadSigned(contractId: string, file: File) {
    try {
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
      />
    </div>
  );
}

function ClientContractCard({
  contract,
  onSign,
  onUploadSigned,
}: {
  contract: EventContract;
  onSign: () => void;
  onUploadSigned: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plannerSigned = !!contract.plannerSignature;
  const clientSigned = !!contract.clientSignature;

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
            onClick={() => downloadBase64File(contract.fileData, contract.fileName)}
            className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-teal-500 px-2 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <Download size={12} />
            Download
          </button>
          {contract.signedFileData && contract.signedFileName ? (
            <button
              onClick={() => downloadBase64File(contract.signedFileData!, contract.signedFileName!)}
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
                <img src={contract.plannerSignature!} alt="Planner signature" className="h-10 object-contain mb-1" />
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
                <img src={contract.clientSignature!} alt="Client signature" className="h-10 object-contain mb-1" />
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rsvpVal, setRsvpVal] = useState<RsvpStatus>("pending");
  const [mealVal, setMealVal] = useState("");
  const [dietaryVal, setDietaryVal] = useState("");
  const [plusOneNameVal, setPlusOneNameVal] = useState("");

  const accepted = guests.filter((g) => g.rsvp === "accepted").length;
  const pending = guests.filter((g) => g.rsvp === "pending").length;

  function startEdit(g: Guest) {
    setEditingId(g.id);
    setRsvpVal(g.rsvp);
    setMealVal(g.mealChoice);
    setDietaryVal(g.dietaryNotes);
    setPlusOneNameVal(g.plusOneName);
  }

  function saveEdit() {
    if (!editingId) return;
    const updated = guests.map((g) =>
      g.id === editingId
        ? { ...g, rsvp: rsvpVal, mealChoice: mealVal, dietaryNotes: dietaryVal, plusOneName: plusOneNameVal }
        : g
    );
    onUpdate(updated);
    setEditingId(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-amber-400" />
          <h2 className="font-heading font-semibold text-stone-800">Guest List & RSVP</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
            <span><span className="font-semibold text-emerald-600">{accepted}</span> accepted</span>
            <span><span className="font-semibold text-amber-600">{pending}</span> pending</span>
        </div>
      </div>

      {guests.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Users size={20} className="text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-400">No guests yet.</p>
        </div>
      ) : (
      <div className="divide-y divide-stone-100">
        {guests.map((guest) => (
          <div key={guest.id} className="px-5 py-4">
            {editingId === guest.id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-800">{guest.name}</span>
                  {guest.plusOne && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">+1</span>}
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
                {guest.plusOne && (
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
                  <button onClick={saveEdit} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-lg hover:bg-rose-500 transition-colors">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-between cursor-pointer"
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
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                    {guest.mealChoice && <span>{guest.mealChoice}</span>}
                    {guest.dietaryNotes && <span className="italic">{guest.dietaryNotes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${RSVP_COLORS[guest.rsvp].split(" ").slice(0, 2).join(" ")}`}>
                    {guest.rsvp}
                  </span>
                  <span className="text-[10px] text-stone-300">tap to edit</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
