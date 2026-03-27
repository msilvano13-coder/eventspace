"use client";

import { useQuestionnaire, useQuestionnaireActions } from "@/hooks/useStore";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  ChevronDown,
  Type,
  AlignLeft,
  List,
  CheckSquare,
  CalendarDays,
} from "lucide-react";
import { Question, QuestionType } from "@/lib/types";

const QUESTION_TYPE_LABELS: Record<QuestionType, { label: string; icon: typeof Type }> = {
  text: { label: "Short Text", icon: Type },
  textarea: { label: "Long Text", icon: AlignLeft },
  select: { label: "Single Choice", icon: List },
  multiselect: { label: "Multi Select", icon: CheckSquare },
  date: { label: "Date", icon: CalendarDays },
};

export default function QuestionnaireEditorPage() {
  const { id } = useParams<{ id: string }>();
  const questionnaire = useQuestionnaire(id);
  const { updateQuestionnaire } = useQuestionnaireActions();

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [descVal, setDescVal] = useState("");

  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);

  // Question form state
  const [qLabel, setQLabel] = useState("");
  const [qType, setQType] = useState<QuestionType>("text");
  const [qRequired, setQRequired] = useState(false);
  const [qOptions, setQOptions] = useState<string[]>([""]);

  if (!questionnaire) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Questionnaire not found.</p>
        <Link href="/planner/questionnaires" className="text-rose-500 hover:underline text-sm mt-2 inline-block">
          Back to questionnaires
        </Link>
      </div>
    );
  }

  const questions = questionnaire.questions;

  // ── Name/desc editing ──
  function startEditName() {
    setNameVal(questionnaire!.name);
    setDescVal(questionnaire!.description);
    setEditingName(true);
  }

  function saveName() {
    if (!nameVal.trim()) { setEditingName(false); return; }
    updateQuestionnaire(id, { name: nameVal.trim(), description: descVal.trim() });
    setEditingName(false);
  }

  // ── Question form helpers ──
  function resetQuestionForm() {
    setQLabel("");
    setQType("text");
    setQRequired(false);
    setQOptions([""]);
    setAddingQuestion(false);
    setEditingQId(null);
  }

  function startEditQuestion(q: Question) {
    setEditingQId(q.id);
    setQLabel(q.label);
    setQType(q.type);
    setQRequired(q.required);
    setQOptions(q.options?.length ? [...q.options] : [""]);
    setAddingQuestion(false);
  }

  function startAddQuestion() {
    resetQuestionForm();
    setAddingQuestion(true);
  }

  function saveQuestion() {
    if (!qLabel.trim()) return;
    const cleanOptions = (qType === "select" || qType === "multiselect")
      ? qOptions.map((o) => o.trim()).filter(Boolean)
      : undefined;

    if ((qType === "select" || qType === "multiselect") && (!cleanOptions || cleanOptions.length < 2)) {
      return; // need at least 2 options
    }

    if (editingQId) {
      const updated = questions.map((q) =>
        q.id === editingQId
          ? { ...q, label: qLabel.trim(), type: qType, required: qRequired, options: cleanOptions }
          : q
      );
      updateQuestionnaire(id, { questions: updated });
    } else {
      const newQ: Question = {
        id: crypto.randomUUID(),
        label: qLabel.trim(),
        type: qType,
        required: qRequired,
        options: cleanOptions,
      };
      updateQuestionnaire(id, { questions: [...questions, newQ] });
    }
    resetQuestionForm();
  }

  function deleteQuestion(qId: string) {
    updateQuestionnaire(id, { questions: questions.filter((q) => q.id !== qId) });
    if (editingQId === qId) resetQuestionForm();
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const reordered = [...questions];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    updateQuestionnaire(id, { questions: reordered });
  }

  const needsOptions = qType === "select" || qType === "multiselect";

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-3xl mx-auto">
      <Link
        href="/planner/questionnaires"
        className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 mb-6"
      >
        <ArrowLeft size={14} />
        All Questionnaires
      </Link>

      {/* ── Header ── */}
      {editingName ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft mb-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Name</label>
              <input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Description</label>
              <input
                value={descVal}
                onChange={(e) => setDescVal(e.target.value)}
                placeholder="Optional description"
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={saveName} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 transition-colors">Save</button>
            <button onClick={() => setEditingName(false)} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold text-stone-800">{questionnaire.name}</h1>
              <button onClick={startEditName} className="p-1.5 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-lg transition-colors">
                <Pencil size={14} />
              </button>
            </div>
            {questionnaire.description && (
              <p className="text-sm text-stone-400 mt-1">{questionnaire.description}</p>
            )}
          </div>
          {!addingQuestion && !editingQId && (
            <button
              onClick={startAddQuestion}
              className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-soft shrink-0"
            >
              <Plus size={16} />
              Add Question
            </button>
          )}
        </div>
      )}

      {/* ── Questions list ── */}
      {questions.length === 0 && !addingQuestion ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
          <p className="text-sm text-stone-400 mb-3">No questions yet.</p>
          <button onClick={startAddQuestion} className="text-sm text-rose-500 hover:text-rose-600 font-medium">
            + Add the first question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) =>
            editingQId === q.id ? (
              <QuestionForm
                key={q.id}
                label={qLabel}
                type={qType}
                required={qRequired}
                options={qOptions}
                needsOptions={needsOptions}
                onLabelChange={setQLabel}
                onTypeChange={setQType}
                onRequiredChange={setQRequired}
                onOptionsChange={setQOptions}
                onSave={saveQuestion}
                onCancel={resetQuestionForm}
                isEdit
              />
            ) : (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveQuestion(idx, -1)}
                      disabled={idx === 0}
                      className="text-stone-300 hover:text-stone-500 disabled:opacity-30 transition-colors"
                    >
                      <GripVertical size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-stone-300">{idx + 1}.</span>
                      <p className="text-sm font-medium text-stone-800">{q.label}</p>
                      {q.required && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500 font-medium">Required</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => { const info = QUESTION_TYPE_LABELS[q.type]; const Icon = info.icon; return (
                        <span className="flex items-center gap-1 text-xs text-stone-400">
                          <Icon size={11} />
                          {info.label}
                        </span>
                      ); })()}
                      {q.options && q.options.length > 0 && (
                        <span className="text-xs text-stone-300">
                          {q.options.length} option{q.options.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {q.options && q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {q.options.map((opt, i) => (
                          <span key={i} className="text-xs bg-stone-50 text-stone-500 px-2 py-0.5 rounded-lg border border-stone-100">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => startEditQuestion(q)} className="p-1.5 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {addingQuestion && (
            <QuestionForm
              label={qLabel}
              type={qType}
              required={qRequired}
              options={qOptions}
              needsOptions={needsOptions}
              onLabelChange={setQLabel}
              onTypeChange={setQType}
              onRequiredChange={setQRequired}
              onOptionsChange={setQOptions}
              onSave={saveQuestion}
              onCancel={resetQuestionForm}
              isEdit={false}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Question form component ──
function QuestionForm({
  label, type, required, options, needsOptions,
  onLabelChange, onTypeChange, onRequiredChange, onOptionsChange,
  onSave, onCancel, isEdit,
}: {
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  needsOptions: boolean;
  onLabelChange: (v: string) => void;
  onTypeChange: (v: QuestionType) => void;
  onRequiredChange: (v: boolean) => void;
  onOptionsChange: (v: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  function addOption() {
    onOptionsChange([...options, ""]);
  }

  function updateOption(idx: number, val: string) {
    const updated = [...options];
    updated[idx] = val;
    onOptionsChange(updated);
  }

  function removeOption(idx: number) {
    onOptionsChange(options.filter((_, i) => i !== idx));
  }

  return (
    <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-soft space-y-4">
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Question *</label>
        <input
          autoFocus
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
          placeholder="e.g. What is your wedding color palette?"
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Answer Type</label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value as QuestionType)}
              className="w-full appearance-none border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none bg-white"
            >
              {Object.entries(QUESTION_TYPE_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer pb-2.5">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => onRequiredChange(e.target.checked)}
              className="w-4 h-4 text-rose-400 border-stone-300 rounded focus:ring-rose-400"
            />
            <span className="text-sm text-stone-600">Required</span>
          </label>
        </div>
      </div>

      {needsOptions && (
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-2">
            Options (min 2)
          </label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-stone-300 w-5 text-right">{idx + 1}.</span>
                <input
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
                {options.length > 1 && (
                  <button onClick={() => removeOption(idx)} className="p-1 text-stone-300 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addOption}
            className="text-xs text-rose-500 hover:text-rose-600 font-medium mt-2"
          >
            + Add option
          </button>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onSave}
          disabled={!label.trim() || (needsOptions && options.filter((o) => o.trim()).length < 2)}
          className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 disabled:opacity-50 transition-colors"
        >
          {isEdit ? "Save" : "Add Question"}
        </button>
        <button onClick={onCancel} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
