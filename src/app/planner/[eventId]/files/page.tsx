"use client";

import { useParams } from "next/navigation";
import { useEvent, useStoreActions } from "@/hooks/useStore";
import Link from "next/link";
import { ArrowLeft, FileText, Image, Palette, File, Upload } from "lucide-react";
import { v4 as uuid } from "uuid";

const typeIcons: Record<string, any> = {
  contract: FileText,
  photo: Image,
  moodboard: Palette,
  other: File,
};

export default function FilesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const { updateEvent } = useStoreActions();

  if (!event) return <div className="px-4 py-6 text-stone-500">Event not found.</div>;

  function handleUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      const fileList = input.files;
      if (!fileList || !event) return;
      const newFiles = Array.from(fileList).map((f) => ({
        id: uuid(),
        name: f.name,
        type: "other" as const,
        url: "#",
        uploadedAt: new Date().toISOString(),
      }));
      updateEvent(eventId, { files: [...event.files, ...newFiles] });
    };
    input.click();
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-4xl mx-auto">
      <Link
        href={`/planner/${eventId}`}
        className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 mb-6"
      >
        <ArrowLeft size={14} />
        Back to {event.name}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-heading font-bold text-stone-800">Shared Files</h1>
        <button
          onClick={handleUpload}
          className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Upload size={14} />
          Upload
        </button>
      </div>

      {event.files.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
          <File size={40} className="text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">No files yet. Upload contracts, photos, or mood boards.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {event.files.map((file) => {
            const Icon = typeIcons[file.type] || File;
            return (
              <div
                key={file.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3 shadow-soft"
              >
                <Icon size={20} className="text-stone-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{file.name}</p>
                  <p className="text-xs text-stone-400">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
