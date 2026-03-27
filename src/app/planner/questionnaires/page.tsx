"use client";

import { useQuestionnaires, useQuestionnaireActions } from "@/hooks/useStore";
import { Plus, ClipboardList, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function QuestionnairesPage() {
  const questionnaires = useQuestionnaires();
  const { createQuestionnaire, deleteQuestionnaire } = useQuestionnaireActions();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    createQuestionnaire({
      name: newName.trim(),
      description: newDesc.trim(),
      questions: [],
    });
    setNewName("");
    setNewDesc("");
    setShowNew(false);
  }

  function confirmDelete() {
    if (deleteId) {
      deleteQuestionnaire(deleteId);
      setDeleteId(null);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-800">Questionnaires</h1>
          <p className="text-sm text-stone-400 mt-1">
            Create templates to assign to events
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-soft"
        >
          <Plus size={16} />
          New Questionnaire
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-soft mb-6">
          <h2 className="font-heading font-semibold text-stone-800 mb-3">New Questionnaire</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Name *</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNew(false); }}
                placeholder="e.g. Wedding Planning Questionnaire"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Description</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description for your reference"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={handleCreate} disabled={!newName.trim()} className="text-xs font-medium bg-rose-400 text-white px-4 py-2 rounded-xl hover:bg-rose-500 disabled:opacity-50 transition-colors">
              Create
            </button>
            <button onClick={() => { setShowNew(false); setNewName(""); setNewDesc(""); }} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {questionnaires.length === 0 && !showNew ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
          <ClipboardList size={40} className="text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500 mb-3">No questionnaires yet.</p>
          <button
            onClick={() => setShowNew(true)}
            className="text-sm text-rose-500 hover:text-rose-600 font-medium"
          >
            + Create your first questionnaire
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {questionnaires.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft hover:shadow-card transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <Link
                  href={`/planner/questionnaires/${q.id}`}
                  className="font-heading font-semibold text-stone-800 group-hover:text-rose-500 transition-colors"
                >
                  {q.name}
                </Link>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/planner/questionnaires/${q.id}`}
                    className="p-1.5 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <Pencil size={13} />
                  </Link>
                  <button
                    onClick={() => setDeleteId(q.id)}
                    className="p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {q.description && (
                <p className="text-xs text-stone-400 mb-3">{q.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span>{q.questions.length} question{q.questions.length !== 1 ? "s" : ""}</span>
                <span>Updated {new Date(q.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div
          className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}
        >
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-xl">
            <h2 className="text-base font-heading font-semibold text-stone-800 mb-2">Delete Questionnaire?</h2>
            <p className="text-sm text-stone-500 mb-6">This cannot be undone. Events already assigned this questionnaire will keep their responses.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 text-sm text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
