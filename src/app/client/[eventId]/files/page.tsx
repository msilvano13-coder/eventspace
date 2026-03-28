"use client";

import { useParams } from "next/navigation";
import { useEvent } from "@/hooks/useStore";
import Link from "next/link";
import { ArrowLeft, FileText, Image, Palette, File } from "lucide-react";

const typeIcons: Record<string, any> = {
  contract: FileText,
  photo: Image,
  moodboard: Palette,
  other: File,
};

export default function ClientFilesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);

  if (!event) return <div className="px-4 py-6 text-stone-500">Event not found.</div>;

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
          <h1 className="text-lg font-heading font-semibold text-stone-800">Shared Files</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {(event.files ?? []).length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
            <File size={40} className="text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">No files shared yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(event.files ?? []).map((file) => {
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
    </div>
  );
}
