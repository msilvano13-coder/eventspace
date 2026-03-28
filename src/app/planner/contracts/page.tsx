"use client";

import { useContractTemplates, useContractTemplateActions } from "@/hooks/useStore";
import { useState, useCallback, useRef } from "react";
import { FileText, Plus, Trash2, Download, Upload, X, Search } from "lucide-react";
import { readPdfAsBase64, downloadBase64File, formatBytes, PDF_MAX_SIZE } from "@/lib/pdf-utils";
import type { ContractTemplate } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function ContractsPage() {
  const templates = useContractTemplates();
  const { addTemplate, removeTemplate } = useContractTemplateActions();

  const [showUpload, setShowUpload] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fileData, setFileData] = useState<{ dataUrl: string; fileName: string; fileSize: number } | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleFile = async (file: File) => {
    setError("");
    try {
      const result = await readPdfAsBase64(file);
      setFileData(result);
      if (!name) setName(file.name.replace(/\.pdf$/i, ""));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to read file.");
    }
  };

  const handleSave = () => {
    if (!name.trim() || !fileData) return;
    const template: ContractTemplate = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      fileData: fileData.dataUrl,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addTemplate(template);
    showToast(`Saved "${template.name}" template`);
    resetForm();
  };

  const resetForm = () => {
    setShowUpload(false);
    setName("");
    setDescription("");
    setFileData(null);
    setError("");
  };

  const filtered = templates.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
            <FileText size={18} className="text-teal-500" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-stone-800">Contract Templates</h1>
            <p className="text-sm text-stone-400 mt-0.5">Reusable contract PDFs for your events</p>
          </div>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Upload Template
        </button>
      </div>

      {/* Search */}
      {templates.length > 0 && (
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full border border-stone-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="absolute inset-0 bg-stone-900/30" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <h2 className="text-sm font-heading font-semibold text-stone-800">Upload Contract Template</h2>
              <button onClick={resetForm} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* File upload */}
              {!fileData ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-2xl p-8 cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-colors">
                  <Upload size={24} className="text-stone-300 mb-2" />
                  <p className="text-sm font-medium text-stone-600">Click to upload a PDF</p>
                  <p className="text-xs text-stone-400 mt-1">Max {formatBytes(PDF_MAX_SIZE)}</p>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl p-3">
                  <FileText size={20} className="text-teal-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{fileData.fileName}</p>
                    <p className="text-xs text-stone-400">{formatBytes(fileData.fileSize)}</p>
                  </div>
                  <button
                    onClick={() => setFileData(null)}
                    className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg hover:bg-white transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Template Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Wedding Contract"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of when to use this template..."
                  rows={2}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-stone-100 bg-stone-50/50">
              <button onClick={resetForm} className="text-xs text-stone-400 hover:text-stone-600 px-4 py-2 rounded-xl hover:bg-stone-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || !fileData}
                className="text-xs font-medium bg-rose-400 text-white px-5 py-2.5 rounded-xl hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {templates.length === 0 && !showUpload && (
        <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center shadow-soft">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
              <FileText size={32} className="text-teal-300" />
            </div>
          </div>
          <p className="text-stone-800 font-medium">No contract templates yet</p>
          <p className="text-sm text-stone-400 mt-1">Upload reusable contract PDFs to assign to events and vendors</p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-rose-400 text-white text-sm font-medium hover:bg-rose-500 transition-colors"
          >
            <Upload size={15} />
            Upload First Template
          </button>
        </div>
      )}

      {/* Template list */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft flex items-start gap-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-stone-800">{template.name}</h3>
                {template.description && (
                  <p className="text-xs text-stone-400 mt-0.5">{template.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                  <span>{template.fileName}</span>
                  <span className="w-1 h-1 rounded-full bg-stone-300" />
                  <span>{formatBytes(template.fileSize)}</span>
                  <span className="w-1 h-1 rounded-full bg-stone-300" />
                  <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => downloadBase64File(template.fileData, template.fileName)}
                  className="p-2 text-stone-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(template.id)}
                  className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {templates.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
          <p className="text-sm text-stone-400">No templates match your search.</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Template?"
        message="This contract template will be permanently deleted. Contracts already assigned to events will not be affected."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId) removeTemplate(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
