"use client";

import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, useStoreActions, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, X, Image, Pencil, Check, Loader2, ZoomIn } from "lucide-react";
import { MoodBoardImage } from "@/lib/types";
import { useIsTeamMember } from "@/hooks/useIsTeamMember";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { compressImageToBlob } from "@/lib/image-compress";
import { uploadToStorage, getSignedUrl, deleteFromStorage } from "@/lib/supabase/storage";
import { getUserId } from "@/lib/supabase/db";

export default function MoodBoardPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["moodBoard"]);
  const { updateEvent } = useStoreActions();
  const readOnly = useIsTeamMember();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const images = event?.moodBoard ?? [];
  const lightboxImg = lightboxId ? images.find((m) => m.id === lightboxId) : null;

  // Refresh signed URLs for storage-backed images on load
  useEffect(() => {
    if (!event) return;
    async function refreshUrls() {
      const needsRefresh = images.filter(img => img.storagePath);
      if (needsRefresh.length === 0) return;
      const updated = await Promise.all(images.map(async (img) => {
        if (!img.storagePath) return img;
        try {
          const url = await getSignedUrl("event-files", img.storagePath);
          const thumb = img.storageThumb ? await getSignedUrl("event-files", img.storageThumb) : img.thumb;
          return { ...img, url, thumb };
        } catch {
          return img;
        }
      }));
      updateEvent(eventId, { moodBoard: updated });
    }
    refreshUrls();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, images.length]);

  if (loading) return <EventLoader className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]" />;

  if (!event) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Event not found.</p>
        <Link href="/planner" className="text-rose-500 hover:underline text-sm mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  async function addImages(files: FileList) {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    setUploading(true);
    setUploadCount(0);
    setUploadTotal(fileArr.length);

    let currentImages = [...images];
    let userId: string;

    try {
      userId = await getUserId();
    } catch {
      setUploading(false);
      return;
    }

    for (let i = 0; i < fileArr.length; i++) {
      setUploadCount(i + 1);
      try {
        const { full, thumb } = await compressImageToBlob(fileArr[i]);
        const imgId = crypto.randomUUID();

        const fullPath = await uploadToStorage("event-files", `${userId}/${eventId}/moodboard/${imgId}.jpg`, full);
        const thumbPath = await uploadToStorage("event-files", `${userId}/${eventId}/moodboard/${imgId}_thumb.jpg`, thumb);

        const fullUrl = await getSignedUrl("event-files", fullPath);
        const thumbUrl = await getSignedUrl("event-files", thumbPath);

        const newImg: MoodBoardImage = {
          id: imgId,
          url: fullUrl,
          thumb: thumbUrl,
          caption: fileArr[i].name.replace(/\.[^.]+$/, ""),
          addedAt: new Date().toISOString(),
          storagePath: fullPath,
          storageThumb: thumbPath,
        };
        currentImages = [...currentImages, newImg];
        updateEvent(eventId, { moodBoard: currentImages });
      } catch {
        // Skip files that fail (too large, corrupt, upload error, etc.)
      }
    }

    setUploading(false);
  }

  function removeImage(id: string) {
    const img = images.find((m) => m.id === id);
    if (img?.storagePath) {
      deleteFromStorage("event-files", img.storagePath).catch(console.error);
      if (img.storageThumb) deleteFromStorage("event-files", img.storageThumb).catch(console.error);
    }
    updateEvent(eventId, { moodBoard: images.filter((m) => m.id !== id) });
    if (lightboxId === id) setLightboxId(null);
  }

  function saveCaption(id: string) {
    const updated = images.map((m) => (m.id === id ? { ...m, caption: editCaption } : m));
    updateEvent(eventId, { moodBoard: updated });
    setEditingId(null);
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/planner/${eventId}`}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft size={14} />
          {event.name}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-800">Mood Board</h1>
          <p className="text-sm text-stone-400 mt-1">
            {images.length} image{images.length !== 1 ? "s" : ""}
          </p>
        </div>
        {!readOnly && (
          <label className={`flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-soft cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {uploadCount}/{uploadTotal}
              </>
            ) : (
              <>
                <Plus size={16} />
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
        )}

      </div>

      {images.length === 0 ? (
        <div className="text-center py-20">
          <Image size={48} className="mx-auto text-stone-200 mb-4" />
          <p className="text-lg text-stone-400 font-heading">No inspiration images yet</p>
          <p className="text-sm text-stone-300 mt-2">
            Upload photos to build your vision board.
          </p>
          <p className="text-xs text-stone-300 mt-1">
            Images are automatically compressed for optimal storage.
          </p>
          {!readOnly && (
            <label className="inline-flex items-center gap-2 mt-6 bg-rose-400 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
              <Plus size={16} />
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
          )}
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="break-inside-avoid group relative bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden"
            >
              {/* Use thumbnail for grid, full image in lightbox */}
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
              <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setLightboxId(img.id)}
                  className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white"
                >
                  <ZoomIn size={12} className="text-stone-500" />
                </button>
                {!readOnly && (
                  <button
                    onClick={() => setConfirmDeleteId(img.id)}
                    className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white"
                  >
                    <X size={12} className="text-stone-500" />
                  </button>
                )}
              </div>

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-3">
                {!readOnly && editingId === img.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveCaption(img.id)}
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
                    {!readOnly && (
                      <button
                        onClick={() => {
                          setEditingId(img.id);
                          setEditCaption(img.caption);
                        }}
                        className="w-5 h-5 bg-white/70 rounded-full flex items-center justify-center shrink-0"
                      >
                        <Pencil size={8} className="text-stone-600" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Remove Image?"
        message="This image will be removed from the mood board."
        confirmLabel="Remove"
        onConfirm={() => { if (confirmDeleteId) removeImage(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
