"use client";

import { useParams } from "next/navigation";
import { useEvent, useStoreActions, useQuestionnaires } from "@/hooks/useStore";
import Link from "next/link";
import { useState } from "react";
import { Calendar, MapPin, FileText, CheckSquare, Check, Circle, Clock, Layout, ClipboardList, ChevronDown, ChevronUp, CheckCircle2, Receipt, Plus, X } from "lucide-react";
import { Question, Invoice, Event } from "@/lib/types";

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
  const todos = [...event.timeline].sort((a, b) => a.order - b.order);
  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-400 rounded-lg flex items-center justify-center font-heading font-bold text-white text-sm shrink-0">
            E
          </div>
          <div className="min-w-0">
            <h1 className="font-heading font-semibold text-stone-800 truncate">{event.name}</h1>
            <p className="text-xs text-stone-400">Client Portal</p>
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

        {/* Day Timeline */}
        {schedule.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-stone-100">
              <Clock size={15} className="text-violet-400" />
              <h2 className="font-heading font-semibold text-stone-800">Day Timeline</h2>
            </div>
            <div className="px-5 py-4 relative">
              {/* Vertical line */}
              <div className="absolute left-[calc(1.25rem+80px)] top-4 bottom-4 w-px bg-stone-100" />
              <div className="space-y-1">
                {schedule.map((item, idx) => (
                  <div key={item.id} className="flex gap-5 py-2.5">
                    {/* Time */}
                    <div className="w-20 shrink-0 text-right pt-0.5">
                      <span className="text-xs font-semibold text-stone-400 tracking-wide whitespace-nowrap">
                        {fmt12(item.time)}
                      </span>
                    </div>
                    {/* Dot */}
                    <div className="relative shrink-0" style={{ width: 0 }}>
                      <div className={`w-2.5 h-2.5 rounded-full border-2 border-white z-10 mt-1 -ml-1.5 ${
                        idx === 0 ? "bg-rose-400 shadow-sm shadow-rose-200" : "bg-stone-300"
                      }`} />
                    </div>
                    {/* Content */}
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
            </div>
          </div>
        )}

        {/* Quick links row */}
        <div className="grid grid-cols-2 gap-3">
          {event.floorPlanJSON && (
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
            <p className="text-xs text-stone-400 mt-1">{event.files.length} shared files</p>
          </Link>
        </div>

        {/* To Do List — read-only progress view */}
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
                <div key={item.id} className="flex items-center gap-3 py-2">
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
                </div>
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
              const allAnswered = questions.length > 0 && questions.every((q) => {
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

        <p className="text-center text-xs text-stone-300 pb-4">Powered by EventSpace</p>
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
function ClientColorPalette({ event, onUpdate }: { event: Event; onUpdate: (colors: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [newColor, setNewColor] = useState("#d4a5a5");
  const colors = event.colorPalette ?? [];

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
            className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600"
          >
            <Plus size={13} />
            Add color
          </button>
        )}
      </div>

      {colors.length === 0 && !adding ? (
        <p className="text-sm text-stone-400">No colors added yet. Add your event colors!</p>
      ) : (
        <div className="flex flex-wrap gap-2.5 items-center">
          {colors.map((color, i) => (
            <div key={i} className="group relative text-center">
              <div
                className="w-10 h-10 rounded-xl ring-1 ring-stone-200 shadow-sm"
                style={{ backgroundColor: color }}
              />
              <button
                onClick={() => onUpdate(colors.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-stone-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X size={8} className="text-stone-400" />
              </button>
              <p className="text-[9px] text-stone-400 mt-1 font-mono">{color}</p>
            </div>
          ))}
        </div>
      )}

      {adding && (
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
                onUpdate([...colors, newColor]);
                setNewColor("#d4a5a5");
                setAdding(false);
              }
            }}
            className="text-xs font-medium bg-rose-400 text-white px-3 py-1.5 rounded-lg hover:bg-rose-500 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setAdding(false); setNewColor("#d4a5a5"); }}
            className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
