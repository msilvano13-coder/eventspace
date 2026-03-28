"use client";

import { useParams } from "next/navigation";
import { useEvent, useStoreActions } from "@/hooks/useStore";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus, X, Image, Pencil, Check } from "lucide-react";
import { MoodBoardImage } from "@/lib/types";

export default function MoodBoardPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const { updateEvent } = useStoreActions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");

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

  const images = event.moodBoard ?? [];

  function addImages(files: FileList) {
    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) return; // 2MB limit
      const reader = new FileReader();
      reader.onload = () => {
        const newImg: MoodBoardImage = {
          id: crypto.randomUUID(),
          url: reader.result as string,
          caption: file.name.replace(/\.[^.]+$/, ""),
          addedAt: new Date().toISOString(),
        };
        // Re-read current state to avoid overwriting concurrent uploads
        updateEvent(eventId, { moodBoard: [...images, newImg] });
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(id: string) {
    updateEvent(eventId, { moodBoard: images.filter((m) => m.id !== id) });
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-800">Mood Board</h1>
          <p className="text-sm text-stone-400 mt-1">
            {images.length} image{images.length !== 1 ? "s" : ""}
          </p>
        </div>
        <label className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-soft cursor-pointer">
          <Plus size={16} />
          Add Images
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

      {images.length === 0 ? (
        <div className="text-center py-20">
          <Image size={48} className="mx-auto text-stone-200 mb-4" />
          <p className="text-lg text-stone-400 font-heading">No inspiration images yet</p>
          <p className="text-sm text-stone-300 mt-2">Upload photos to build your vision board.</p>
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
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="break-inside-avoid group relative bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden"
            >
              <img
                src={img.url}
                alt={img.caption}
                className="w-full object-cover"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Delete button */}
              <button
                onClick={() => removeImage(img.id)}
                className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
              >
                <X size={12} className="text-stone-500" />
              </button>

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-3">
                {editingId === img.id ? (
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
  );
}
