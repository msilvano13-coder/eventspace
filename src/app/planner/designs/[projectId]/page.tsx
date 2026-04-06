"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Palette,
  Sparkles,
  Plus,
  Loader2,
  Check,
  Trash2,
  Image,
  ChevronRight,
  AlertCircle,
  LayoutGrid,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/db";
import { getSignedUrl, deleteFromStorage } from "@/lib/supabase/storage";
import type { DesignProject, VenuePhoto, GeneratedImage, FloorPlan, LayoutObject } from "@/lib/types";

interface EventWithFloorPlans {
  id: string;
  name: string;
  floorPlans: FloorPlan[];
}

type Step = "upload" | "customize" | "generate";

const STEPS: { key: Step; label: string; icon: typeof Upload }[] = [
  { key: "upload", label: "Upload Photos", icon: Upload },
  { key: "customize", label: "Customize", icon: Palette },
  { key: "generate", label: "Generate", icon: Sparkles },
];

export default function DesignProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  useRouter(); // keep for future navigation

  const [project, setProject] = useState<DesignProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("upload");

  // Upload state
  const [photos, setPhotos] = useState<(VenuePhoto & { url: string })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customization state
  const [designDescription, setDesignDescription] = useState("");

  // Generate state
  const [generations, setGenerations] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const pollTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Floor plan reference state
  const [eventsWithPlans, setEventsWithPlans] = useState<EventWithFloorPlans[]>([]);
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<string | null>(null);
  const [floorPlanData, setFloorPlanData] = useState<{ type: string; count: number }[] | null>(null);
  const [floorPlanSummary, setFloorPlanSummary] = useState<string | null>(null);

  // ── Fetch project ──
  useEffect(() => {
    fetchProject();
    const timers = pollTimers.current;
    return () => {
      // Cleanup poll timers
      timers.forEach((timer) => clearInterval(timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function fetchProject() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("design_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;

      setProject({
        id: data.id,
        name: data.name,
        clientName: data.client_name,
        clientEmail: data.client_email,
        eventDate: data.event_date,
        venueName: data.venue_name,
        status: data.status,
        shareToken: data.share_token,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });

      // Fetch existing photos
      await fetchPhotos();
    } catch (err) {
      console.error("Failed to fetch project:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPhotos() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("venue_photos")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const photosWithUrls = await Promise.all(
        (data ?? []).map(async (row: Record<string, unknown>) => {
          let url = "";
          try {
            url = await getSignedUrl("venue-photos", row.storage_path as string);
          } catch {
            // ignore
          }
          return {
            id: row.id as string,
            projectId: row.project_id as string,
            storagePath: row.storage_path as string,
            originalName: row.original_name as string,
            width: row.width as number | null,
            height: row.height as number | null,
            isPrimary: row.is_primary as boolean,
            sortOrder: row.sort_order as number,
            createdAt: row.created_at as string,
            url,
          };
        })
      );

      setPhotos(photosWithUrls);
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    }
  }

  // ── Upload handlers ──
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (fileArr.length === 0) return;

      setUploading(true);
      setUploadCount(0);
      setUploadTotal(fileArr.length);

      let userId: string;
      try {
        userId = await getUserId();
      } catch {
        setUploading(false);
        return;
      }

      const supabase = createClient();

      for (let i = 0; i < fileArr.length; i++) {
        setUploadCount(i + 1);
        try {
          const file = fileArr[i];
          const fileId = crypto.randomUUID();
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${userId}/${projectId}/${fileId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("venue-photos")
            .upload(path, file, { upsert: true });

          if (uploadError) throw uploadError;

          // Insert record
          const { data: photoRow, error: insertError } = await supabase
            .from("venue_photos")
            .insert({
              project_id: projectId,
              storage_path: path,
              original_name: file.name,
              width: null,
              height: null,
              is_primary: photos.length === 0 && i === 0,
              sort_order: photos.length + i,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          const url = await getSignedUrl("venue-photos", path);

          setPhotos((prev) => [
            ...prev,
            {
              id: photoRow.id,
              projectId: photoRow.project_id,
              storagePath: photoRow.storage_path,
              originalName: photoRow.original_name,
              width: photoRow.width,
              height: photoRow.height,
              isPrimary: photoRow.is_primary,
              sortOrder: photoRow.sort_order,
              createdAt: photoRow.created_at,
              url,
            },
          ]);
        } catch (err) {
          console.error("Upload failed for file:", fileArr[i].name, err);
        }
      }

      setUploading(false);
    },
    [projectId, photos.length]
  );

  async function removePhoto(photo: VenuePhoto & { url: string }) {
    try {
      const supabase = createClient();
      await deleteFromStorage("venue-photos", photo.storagePath);
      await supabase.from("venue_photos").delete().eq("id", photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      console.error("Failed to remove photo:", err);
    }
  }

  // ── Floor plan reference ──
  async function fetchEventsWithFloorPlans() {
    if (eventsWithPlans.length > 0) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("events")
        .select("id, name, floor_plans (id, name, layout_objects (*))")
        .is("floor_plans.deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const events: EventWithFloorPlans[] = (data ?? [])
        .filter((e: Record<string, unknown>) => {
          const fps = e.floor_plans as unknown[];
          return Array.isArray(fps) && fps.length > 0;
        })
        .map((e: Record<string, unknown>) => ({
          id: e.id as string,
          name: e.name as string,
          floorPlans: (e.floor_plans as Record<string, unknown>[]).map((fp) => ({
            id: fp.id as string,
            name: fp.name as string,
            json: null,
            canvasWidth: 800,
            canvasHeight: 600,
            lightingZones: [],
            layoutObjects: Array.isArray(fp.layout_objects)
              ? (fp.layout_objects as Record<string, unknown>[]).map((lo): LayoutObject => ({
                  id: lo.id as string,
                  floorPlanId: lo.floor_plan_id as string,
                  assetId: lo.asset_id as string,
                  positionX: Number(lo.position_x) || 0,
                  positionY: Number(lo.position_y) || 0,
                  rotation: Number(lo.rotation) || 0,
                  scaleX: Number(lo.scale_x) || 1,
                  scaleY: Number(lo.scale_y) || 1,
                  widthOverride: null,
                  heightOverride: null,
                  label: (lo.label as string) || "",
                  groupId: null,
                  parentId: null,
                  tableId: null,
                  fillOverride: null,
                  strokeOverride: null,
                  tablescapeId: (lo.tablescape_id as string) || null,
                  metadata: {},
                  zIndex: Number(lo.z_index) || 0,
                }))
              : [],
            roomShape: null,
          })),
        }));

      setEventsWithPlans(events);
    } catch (err) {
      console.error("Failed to fetch floor plans:", err);
    }
  }

  function selectFloorPlan(floorPlan: FloorPlan | null) {
    if (!floorPlan) {
      setSelectedFloorPlanId(null);
      setFloorPlanData(null);
      setFloorPlanSummary(null);
      return;
    }
    setSelectedFloorPlanId(floorPlan.id);

    // Build structured data for Claude Vision
    const counts: Record<string, number> = {};
    for (const obj of floorPlan.layoutObjects) {
      const name = obj.label || obj.assetId.replace(/-/g, " ").replace(/_/g, " ");
      counts[name] = (counts[name] || 0) + 1;
    }

    const items = Object.entries(counts).map(([type, count]) => ({ type, count }));
    setFloorPlanData(items.length > 0 ? items : null);

    // Human-readable summary for UI
    const summary = items
      .map(({ type, count }) => (count > 1 ? `${count}x ${type}` : type))
      .join(", ");
    setFloorPlanSummary(summary || null);
  }

  // ── Generation ──
  async function startGeneration() {
    if (photos.length === 0 || !designDescription.trim()) return;
    setGenerating(true);

    const newGenerations: GeneratedImage[] = [];

    for (const photo of photos) {
      const gen: GeneratedImage = {
        id: crypto.randomUUID(),
        projectId,
        venuePhotoId: photo.id,
        styleId: null,
        storagePath: null,
        thumbnailPath: null,
        replicateId: null,
        status: "pending",
        errorMessage: null,
        promptUsed: "",
        seed: null,
        generationTimeMs: null,
        createdAt: new Date().toISOString(),
      };
      newGenerations.push(gen);
    }

    setGenerations(newGenerations);

    // Kick off generation for each photo
    for (const gen of newGenerations) {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            venuePhotoId: gen.venuePhotoId,
            designDescription: designDescription.trim(),
            ...(floorPlanData ? { floorPlanData } : {}),
          }),
        });

        if (!res.ok) throw new Error("Generation request failed");

        const data = await res.json();

        const serverGenId = data.generationId || gen.id;

        setGenerations((prev) =>
          prev.map((g) =>
            g.id === gen.id
              ? {
                  ...g,
                  id: serverGenId,
                  replicateId: data.replicateId || null,
                  status: "processing" as const,
                  promptUsed: data.promptUsed || "",
                }
              : g
          )
        );

        // Start polling
        const generationId = serverGenId;
        const timer = setInterval(async () => {
          try {
            const statusRes = await fetch(
              `/api/generate/status?id=${generationId}`
            );
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();

            if (
              statusData.status === "complete" ||
              statusData.status === "failed"
            ) {
              clearInterval(timer);
              pollTimers.current.delete(generationId);

              setGenerations((prev) =>
                prev.map((g) =>
                  (g.id === generationId || g.id === gen.id)
                    ? {
                        ...g,
                        status: statusData.status,
                        storagePath: statusData.storagePath || null,
                        errorMessage: statusData.error || null,
                        generationTimeMs: statusData.generationTimeMs || null,
                        _imageUrl: statusData.imageUrl || "",
                      } as GeneratedImage & { _imageUrl?: string }
                    : g
                )
              );
            }
          } catch {
            // ignore poll errors
          }
        }, 3000);

        pollTimers.current.set(generationId, timer);
      } catch (err) {
        console.error("Generation failed:", err);
        setGenerations((prev) =>
          prev.map((g) =>
            g.id === gen.id
              ? { ...g, status: "failed" as const, errorMessage: "Request failed" }
              : g
          )
        );
      }
    }

    setGenerating(false);
  }

  // ── Step navigation ──
  function goToStep(nextStep: Step) {
    if (nextStep === "customize") {
      fetchEventsWithFloorPlans();
    }
    setStep(nextStep);
  }

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  // ── Loading / not found ──
  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]">
        <Loader2 size={24} className="animate-spin text-stone-300" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <p className="text-stone-500">Project not found.</p>
        <Link
          href="/planner/designs"
          className="text-rose-500 hover:underline text-sm mt-2 inline-block"
        >
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl mx-auto">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/planner/designs"
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ArrowLeft size={14} />
          Design Projects
        </Link>
      </div>

      {/* Project header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-stone-800">
          {project.name}
        </h1>
        {project.venueName && (
          <p className="text-sm text-stone-400 mt-1">{project.venueName}</p>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, idx) => {
          const isActive = s.key === step;
          const isComplete = idx < currentStepIdx;
          return (
            <button
              key={s.key}
              onClick={() => goToStep(s.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : isComplete
                  ? "bg-stone-50 text-stone-600 border border-stone-200"
                  : "text-stone-400 border border-transparent hover:bg-stone-50"
              }`}
            >
              {isComplete ? (
                <Check size={16} className="text-emerald-500" />
              ) : (
                <s.icon size={16} />
              )}
              {s.label}
              {idx < STEPS.length - 1 && (
                <ChevronRight
                  size={14}
                  className="text-stone-300 ml-1 hidden sm:block"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      {step === "upload" && (
        <UploadStep
          photos={photos}
          uploading={uploading}
          uploadCount={uploadCount}
          uploadTotal={uploadTotal}
          dragOver={dragOver}
          setDragOver={setDragOver}
          handleFiles={handleFiles}
          removePhoto={removePhoto}
          fileInputRef={fileInputRef}
          onNext={() => goToStep("customize")}
        />
      )}

      {step === "customize" && (
        <CustomizeStep
          designDescription={designDescription}
          setDesignDescription={setDesignDescription}
          eventsWithPlans={eventsWithPlans}
          selectedFloorPlanId={selectedFloorPlanId}
          floorPlanSummary={floorPlanSummary}
          onSelectFloorPlan={selectFloorPlan}
          onBack={() => goToStep("upload")}
          onGenerate={() => {
            goToStep("generate");
            startGeneration();
          }}
        />
      )}

      {step === "generate" && (
        <GenerateStep
          photos={photos}
          generations={generations}
          generating={generating}
          onBack={() => goToStep("customize")}
        />
      )}
    </div>
  );
}

// ── Upload Step ──

function UploadStep({
  photos,
  uploading,
  uploadCount,
  uploadTotal,
  dragOver,
  setDragOver,
  handleFiles,
  removePhoto,
  fileInputRef,
  onNext,
}: {
  photos: (VenuePhoto & { url: string })[];
  uploading: boolean;
  uploadCount: number;
  uploadTotal: number;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleFiles: (files: FileList | File[]) => void;
  removePhoto: (photo: VenuePhoto & { url: string }) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onNext: () => void;
}) {
  return (
    <div>
      {/* Drag & drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
          dragOver
            ? "border-rose-400 bg-rose-50"
            : "border-stone-200 bg-stone-50 hover:border-stone-300"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-rose-400" />
            <p className="text-sm text-stone-500">
              Uploading {uploadCount}/{uploadTotal}...
            </p>
          </div>
        ) : (
          <>
            <Upload size={36} className="mx-auto text-stone-300 mb-3" />
            <p className="text-sm text-stone-500 mb-1">
              Drag & drop venue photos here
            </p>
            <p className="text-xs text-stone-400 mb-4">or click to browse</p>
            <label className="inline-flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
              <Plus size={16} />
              Select Photos
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        )}
      </div>

      {/* Uploaded photos grid */}
      {photos.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-stone-600 mb-3">
            Uploaded Photos ({photos.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden"
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.originalName}
                    className="w-full h-36 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-36 bg-stone-100 flex items-center justify-center">
                    <Image size={24} className="text-stone-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => removePhoto(photo)}
                    className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white"
                  >
                    <Trash2 size={12} className="text-stone-500" />
                  </button>
                </div>
                <div className="p-2">
                  <p className="text-xs text-stone-500 truncate">
                    {photo.originalName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next button */}
      <div className="flex justify-end mt-8">
        <button
          onClick={onNext}
          disabled={photos.length === 0}
          className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 disabled:opacity-50 disabled:pointer-events-none text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          Next: Choose Styles
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Customize Step ──

function CustomizeStep({
  designDescription,
  setDesignDescription,
  eventsWithPlans,
  selectedFloorPlanId,
  floorPlanSummary,
  onSelectFloorPlan,
  onBack,
  onGenerate,
}: {
  designDescription: string;
  setDesignDescription: (v: string) => void;
  eventsWithPlans: EventWithFloorPlans[];
  selectedFloorPlanId: string | null;
  floorPlanSummary: string | null;
  onSelectFloorPlan: (fp: FloorPlan | null) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div>
      {/* Design Description */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 mb-2">
          Describe Your Vision
        </h3>
        <p className="text-xs text-stone-400 mb-4">
          Describe the furniture styles, colors, linens, florals, lighting, and overall mood.
          Be as specific as you like — the AI will interpret your vision.
        </p>
        <textarea
          value={designDescription}
          onChange={(e) => setDesignDescription(e.target.value)}
          placeholder="e.g. Chiavari chairs in cream with gold accents, burgundy velvet table runners, lush greenery centerpieces with white roses and eucalyptus, warm string lights overhead, gold charger plates, ivory linens..."
          rows={5}
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent resize-none"
        />
        <p className="text-[10px] text-stone-300 mt-2 text-right">
          {designDescription.length > 0 ? `${designDescription.length} characters` : ""}
        </p>
      </div>

      {/* Floor Plan Reference */}
      <div className="border-t border-stone-100 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <LayoutGrid size={16} className="text-stone-400" />
          <h3 className="text-sm font-medium text-stone-700">
            Floor Plan Layout{" "}
            <span className="text-stone-400 font-normal">(optional)</span>
          </h3>
        </div>
        <p className="text-xs text-stone-400 mb-4">
          Select a floor plan to tell the AI what furniture to place and where.
        </p>

        {eventsWithPlans.length === 0 ? (
          <p className="text-xs text-stone-300 italic">
            No events with floor plans found.
          </p>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => onSelectFloorPlan(null)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                !selectedFloorPlanId
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-stone-200 text-stone-500 hover:border-stone-300"
              }`}
            >
              No floor plan — style only
            </button>

            {eventsWithPlans.map((event) =>
              event.floorPlans.map((fp) => (
                <button
                  key={fp.id}
                  onClick={() => onSelectFloorPlan(fp)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    selectedFloorPlanId === fp.id
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-stone-200 text-stone-500 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-stone-700">{fp.name}</span>
                      <span className="text-stone-400 ml-2">from {event.name}</span>
                      <span className="text-stone-300 ml-2 text-xs">
                        ({fp.layoutObjects.length} items)
                      </span>
                    </div>
                    {selectedFloorPlanId === fp.id && (
                      <Check size={14} className="text-rose-500" />
                    )}
                  </div>
                </button>
              ))
            )}

            {selectedFloorPlanId && floorPlanSummary && (
              <div className="mt-3 bg-white rounded-xl border border-stone-200 p-3">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wide mb-2">
                  Items from Floor Plan
                </p>
                <p className="text-xs text-stone-600">
                  {floorPlanSummary}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={onGenerate}
          disabled={!designDescription.trim()}
          className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 disabled:opacity-50 disabled:pointer-events-none text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Sparkles size={16} />
          Generate Designs
        </button>
      </div>
    </div>
  );
}

// ── Generate Step ──

function GenerateStep({
  photos,
  generations,
  generating,
  onBack,
}: {
  photos: (VenuePhoto & { url: string })[];
  generations: (GeneratedImage & { _imageUrl?: string })[];
  generating: boolean;
  onBack: () => void;
}) {
  const photoMap = new Map(photos.map((p) => [p.id, p]));

  if (generations.length === 0 && !generating) {
    return (
      <div className="text-center py-20">
        <Sparkles size={48} className="mx-auto text-stone-200 mb-4" />
        <p className="text-lg text-stone-400 font-heading">
          No generations yet
        </p>
        <p className="text-sm text-stone-300 mt-2">
          Go back and select styles to generate designs.
        </p>
        <button
          onClick={onBack}
          className="mt-6 text-sm text-rose-500 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-stone-500">
          {generations.filter((g) => g.status === "complete").length}/
          {generations.length} complete
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {generations.map((gen) => {
          const photo = photoMap.get(gen.venuePhotoId);
          return (
            <div
              key={gen.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-stone-100">
                <p className="text-xs font-medium text-stone-700 truncate">
                  {photo?.originalName ?? "Photo"}
                </p>
              </div>

              {/* Before / After comparison */}
              <div className="grid grid-cols-2 gap-px bg-stone-100">
                {/* Original */}
                <div className="bg-white">
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wide">
                      Original
                    </span>
                  </div>
                  {photo?.url ? (
                    <img
                      src={photo.url}
                      alt="Original"
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-48 bg-stone-50 flex items-center justify-center">
                      <Image size={24} className="text-stone-300" />
                    </div>
                  )}
                </div>

                {/* Generated */}
                <div className="bg-white">
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wide">
                      Generated
                    </span>
                  </div>
                  {gen.status === "complete" && gen._imageUrl ? (
                    <img
                      src={gen._imageUrl}
                      alt="Generated"
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                  ) : gen.status === "failed" ? (
                    <div className="w-full h-48 bg-red-50 flex flex-col items-center justify-center gap-2 p-4">
                      <AlertCircle size={24} className="text-red-300" />
                      <p className="text-xs text-red-400 text-center">
                        {gen.errorMessage || "Generation failed"}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-stone-50 flex flex-col items-center justify-center gap-2">
                      <Loader2
                        size={24}
                        className="animate-spin text-rose-300"
                      />
                      <p className="text-xs text-stone-400">
                        {gen.status === "pending"
                          ? "Queued..."
                          : "Generating..."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              {gen.status === "complete" && gen.generationTimeMs && (
                <div className="px-4 py-2 border-t border-stone-100">
                  <p className="text-[10px] text-stone-400">
                    Generated in{" "}
                    {(gen.generationTimeMs / 1000).toFixed(1)}s
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Back button */}
      <div className="flex items-center mt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Styles
        </button>
      </div>
    </div>
  );
}
