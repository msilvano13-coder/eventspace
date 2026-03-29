"use client";

import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, useStoreActions } from "@/hooks/useStore";
import Link from "next/link";
import { ArrowLeft, FileText, Image, Palette, File, Upload, Trash2, Plus } from "lucide-react";

const typeIcons: Record<string, any> = {
  contract: FileText,
  photo: Image,
  moodboard: Palette,
  other: File,
};

const typeColors: Record<string, string> = {
  contract: "bg-teal-50 text-teal-500",
  photo: "bg-pink-50 text-pink-500",
  moodboard: "bg-violet-50 text-violet-500",
  other: "bg-stone-100 text-stone-400",
};

export default function ClientFilesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  useEventSubEntities(eventId, ["files"]);
  const { updateEvent } = useStoreActions();

  if (!event) return <div className="px-4 py-6 text-stone-500">Event not found.</div>;

  const files = event.files ?? [];

  function handleUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      const fileList = input.files;
      if (!fileList || !event) return;
      const newFiles = Array.from(fileList).map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        type: "other" as const,
        url: "#",
        storagePath: null,
        uploadedAt: new Date().toISOString(),
      }));
      updateEvent(eventId, { files: [...files, ...newFiles] });
    };
    input.click();
  }

  function removeFile(id: string) {
    updateEvent(eventId, { files: files.filter((f) => f.id !== id) });
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href={`/client/${eventId}`}
            className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 mb-2"
          >
            <ArrowLeft size={14} />
            Back to Portal
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-heading font-semibold text-stone-800">Shared Files</h1>
            <button
              onClick={handleUpload}
              className="flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              Upload
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {files.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
            <Upload size={40} className="text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500 mb-1">No files shared yet.</p>
            <p className="text-xs text-stone-400 mb-4">Upload documents for your planner to review.</p>
            <button
              onClick={handleUpload}
              className="inline-flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              Upload Files
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((file) => {
              const Icon = typeIcons[file.type] || File;
              const colorClass = typeColors[file.type] || typeColors.other;
              return (
                <div
                  key={file.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3 shadow-soft group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{file.name}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(file.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="sm:opacity-0 sm:group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all p-1.5"
                    aria-label="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
