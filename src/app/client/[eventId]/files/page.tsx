"use client";

import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, useStoreActions } from "@/hooks/useStore";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileText, Image, Palette, File, Upload, Trash2, Plus, Download, Loader2, AlertCircle } from "lucide-react";

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

function inferFileType(name: string): "contract" | "photo" | "moodboard" | "other" {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || lower.includes("contract") || lower.includes("agreement")) return "contract";
  if (/\.(jpg|jpeg|png|gif|webp|svg|heic)$/i.test(lower)) return "photo";
  if (lower.includes("moodboard") || lower.includes("mood-board") || lower.includes("inspiration")) return "moodboard";
  return "other";
}

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

export default function ClientFilesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  useEventSubEntities(eventId, ["files"]);
  const { updateEvent } = useStoreActions();
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!event) return <div className="px-4 py-6 text-stone-500">Event not found.</div>;

  const files = event.files ?? [];
  const shareToken = event.shareToken;

  function showError(msg: string) {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  }

  async function handleUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      const fileList = input.files;
      if (!fileList || !event) return;

      if (!shareToken) {
        showError("Upload unavailable — sharing link not configured.");
        return;
      }

      setUploading(true);
      try {
        const newFiles = [];
        let failCount = 0;
        for (const file of Array.from(fileList)) {
          const fileId = crypto.randomUUID();
          const storagePath = `${eventId}/files/${fileId}-${file.name}`;

          try {
            const resolvedPath = await uploadClientFile(shareToken, "event-files", storagePath, file);
            newFiles.push({
              id: fileId,
              name: file.name,
              type: inferFileType(file.name),
              url: "",
              storagePath: resolvedPath,
              uploadedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error("[Files] Storage upload failed:", err);
            failCount++;
          }
        }

        if (newFiles.length > 0) {
          // Read latest files from event to avoid stale reference
          const latestFiles = event.files ?? [];
          updateEvent(eventId, { files: [...latestFiles, ...newFiles] });
        }
        if (failCount > 0) {
          showError(`${failCount} file${failCount > 1 ? "s" : ""} failed to upload.`);
        }
      } catch (err) {
        console.error("[Files] Upload error:", err);
        showError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  async function handleDownload(file: { id: string; name: string; url: string; storagePath: string | null }) {
    setDownloadingId(file.id);
    try {
      if (file.storagePath && shareToken) {
        const url = await getClientSignedUrl(shareToken, "event-files", file.storagePath);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      } else if (file.url && file.url !== "#" && file.url !== "") {
        const a = document.createElement("a");
        a.href = file.url;
        a.download = file.name;
        a.target = "_blank";
        a.click();
      } else {
        showError("This file is not available for download.");
      }
    } catch (err) {
      console.error("[Files] Download failed:", err);
      showError("Download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
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
              disabled={uploading}
              className="flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-wait text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Error toast */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl animate-in fade-in">
            <AlertCircle size={15} className="shrink-0" />
            {errorMsg}
          </div>
        )}

        {files.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
            <Upload size={40} className="text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500 mb-1">No files shared yet.</p>
            <p className="text-xs text-stone-400 mb-4">Upload documents for your planner to review.</p>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {uploading ? "Uploading..." : "Upload Files"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((file) => {
              const Icon = typeIcons[file.type] || File;
              const colorClass = typeColors[file.type] || typeColors.other;
              const canDownload = !!(file.storagePath || (file.url && file.url !== "#" && file.url !== ""));
              const isDownloading = downloadingId === file.id;
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
                  <div className="flex items-center gap-0.5">
                    {canDownload && (
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={isDownloading}
                        className="text-stone-400 hover:text-teal-500 transition-all p-1.5"
                        aria-label="Download file"
                      >
                        {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all p-1.5"
                      aria-label="Remove file"
                    >
                      <Trash2 size={14} />
                    </button>
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
