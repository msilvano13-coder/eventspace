"use client";

import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, useStoreActions, useEventsLoading } from "@/hooks/useStore";
import { useIsTeamMember } from "@/hooks/useIsTeamMember";
import EventLoader from "@/components/ui/EventLoader";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileText, Image, Palette, File, Upload, Download, X, Loader2 } from "lucide-react";
import { v4 as uuid } from "uuid";
import { uploadToStorage, getSignedUrl, deleteFromStorage } from "@/lib/supabase/storage";
import { getUserId } from "@/lib/supabase/db";
import { showErrorToast } from "@/lib/error-toast";

const typeIcons: Record<string, any> = {
  contract: FileText,
  photo: Image,
  moodboard: Palette,
  other: File,
};

function getFileType(file: File): "contract" | "photo" | "moodboard" | "other" {
  if (file.type === "application/pdf") return "contract";
  if (file.type.startsWith("image/")) return "photo";
  return "other";
}

export default function FilesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["files"]);
  const { updateEvent } = useStoreActions();
  const readOnly = useIsTeamMember();
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;
  if (!event) return <div className="px-4 py-6 text-stone-500">Event not found.</div>;

  async function handleUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      const fileList = input.files;
      if (!fileList || !event) return;

      setUploading(true);
      try {
        const userId = await getUserId();
        const newFiles = [];

        for (const file of Array.from(fileList)) {
          const fileId = uuid();
          const storagePath = `${userId}/${eventId}/files/${fileId}/${file.name}`;

          await uploadToStorage("event-files", storagePath, file);

          newFiles.push({
            id: fileId,
            name: file.name,
            type: getFileType(file),
            url: storagePath,
            storagePath,
            uploadedAt: new Date().toISOString(),
          });
        }

        updateEvent(eventId, { files: [...event.files, ...newFiles] });
      } catch (err) {
        console.error("File upload failed:", err);
        showErrorToast("Failed to upload files. Please try again.");
      }
      setUploading(false);
    };
    input.click();
  }

  async function handleDownload(file: { storagePath: string | null; url: string; name: string; id: string }) {
    if (!file.storagePath) return;
    setDownloading(file.id);
    try {
      const url = await getSignedUrl("event-files", file.storagePath);
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Download failed:", err);
      showErrorToast("Failed to download file.");
    }
    setDownloading(null);
  }

  function handleRemove(fileId: string) {
    const file = event!.files.find(f => f.id === fileId);
    if (file?.storagePath) {
      deleteFromStorage("event-files", file.storagePath).catch(console.error);
    }
    updateEvent(eventId, { files: event!.files.filter(f => f.id !== fileId) });
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
        {!readOnly && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={14} />
                Upload
              </>
            )}
          </button>
        )}
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
                className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3 shadow-soft group"
              >
                <Icon size={20} className="text-stone-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{file.name}</p>
                  <p className="text-xs text-stone-400">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.storagePath && (
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
                    >
                      {downloading === file.id ? (
                        <Loader2 size={14} className="text-stone-400 animate-spin" />
                      ) : (
                        <Download size={14} className="text-stone-400" />
                      )}
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      onClick={() => handleRemove(file.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      <X size={14} className="text-stone-400 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
