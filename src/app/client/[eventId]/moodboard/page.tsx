"use client";

import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, useStoreActions } from "@/hooks/useStore";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus, X, Image, Pencil, Check, Loader2, ZoomIn } from "lucide-react";
import { MoodBoardImage } from "@/lib/types";
import { compressImage } from "@/lib/image-compress";

export default function ClientMoodBoardPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  useEventSubEntities(eventId, ["moodBoard"]);
  const { updateEvent } = useStoreActions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  if (!event) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">Event not found.</p>
      </div>
    );
  }

  const images = event.moodBoard ?? [];
  const lightboxImg = lightboxId ? images.find((m) => m.id === lightboxId) : null;

  async function addImages(files: FileList) {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    setUploading(true);
    setUploadCount(0);
    setUploadTotal(fileArr.length);

    let currentImages = [...images];

    for (let i = 0; i < fileArr.length; i++) {
      setUploadCount(i + 1);
      try {
        const { full, thumb } = await compressImage(fileArr[i]);
        const newImg: MoodBoardImage = {
          id: crypto.randomUUID(),
          url: full,
          thumb,
          caption: fileArr[i].name.replace(/\.[^.]+$/, ""),
          addedAt: new Date().toISOString(),
          storagePath: null,
          storageThumb: null,
        };
        currentImages = [...currentImages, newImg];
        updateEvent(eventId, { moodBoard: currentImages });
      } catch {
        // Skip files that fail
      }
    }

    setUploading(false);
  }

  function removeImage(id: string) {
    updateEvent(eventId, { moodBoard: images.filter((m) => m.id !== id) });
    if (lightboxId === id) setLightboxId(null);
  }

  function saveCaption(id: string) {
    const updated = images.map((m) => (m.id === id ? { ...m, caption: editCaption } : m));
    updateEvent(eventId, { moodBoard: updated });
    setEditingId(null);
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
            <div>
              <h1 className="text-lg font-heading font-semibold text-stone-800">Mood Board</h1>
              <p className="text-xs text-stone-400 mt-0.5">
                {images.length} image{images.length !== 1 ? "s" : ""}
              </p>
            </div>
            <label className={`flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {uploadCount}/{uploadTotal}
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Add Images
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files) addImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {images.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-soft">
            <Image size={40} className="text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500 mb-1">No inspiration images yet</p>
            <p className="text-xs text-stone-400 mb-4">Upload photos to build your vision board together.</p>
            <label className="inline-flex items-center gap-1.5 bg-rose-400 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
              <Plus size={14} />
              Upload Photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 gap-3 space-y-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="break-inside-avoid group relative bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden"
              >
                <img
                  src={img.thumb || img.url}
                  alt={img.caption}
                  className="w-full object-cover cursor-pointer"
                  loading="lazy"
                  onClick={() => setLightboxId(img.id)}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Top-right actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setLightboxId(img.id)}
                    className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white"
                  >
                    <ZoomIn size={12} className="text-stone-500" />
                  </button>
                  <button
                    onClick={() => removeImage(img.id)}
                    className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white"
                  >
                    <X size={12} className="text-stone-500" />
                  </button>
                </div>

                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-3">
                  {editingId === img.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveCaption(img.id); if (e.key === "Escape") setEditingId(null); }}
                        className="flex-1 text-xs bg-white/90 rounded-lg px-2 py-1.5 outline-none text-stone-700"
                      />
                      <button
                        onClick={() => saveCaption(img.id)}
                        className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center"
                      >
                        <Check size={10} className="text-emerald-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="flex-1 text-xs text-white font-medium truncate">
                        {img.caption || "No caption"}
                      </p>
                      <button
                        onClick={() => {
                          setEditingId(img.id);
                          setEditCaption(img.caption);
                        }}
                        className="w-5 h-5 bg-white/70 rounded-full flex items-center justify-center shrink-0"
                      >
                        <Pencil size={8} className="text-stone-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxId(null)}
        >
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <X size={20} className="text-white" />
          </button>
          <div className="max-w-4xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImg.url}
              alt={lightboxImg.caption}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            {lightboxImg.caption && (
              <p className="text-center text-white/80 text-sm mt-3">{lightboxImg.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
