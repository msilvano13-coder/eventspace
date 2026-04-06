import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGeneration } from "@/lib/replicate";
import { analyzeScene, type FloorPlanItem } from "@/lib/scene-analysis";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, venuePhotoId, designDescription, floorPlanData } = body;

    if (!projectId || !venuePhotoId || !designDescription) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify project ownership
    const { data: project, error: projErr } = await supabase
      .from("design_projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();
    if (projErr || !project || project.user_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get venue photo
    const { data: photo, error: photoErr } = await supabase
      .from("venue_photos")
      .select("storage_path")
      .eq("id", venuePhotoId)
      .single();
    if (photoErr || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Get signed URL for the venue photo
    const { data: signedData, error: signErr } = await supabase.storage
      .from("venue-photos")
      .createSignedUrl(photo.storage_path, 3600);
    if (signErr || !signedData?.signedUrl) {
      return NextResponse.json({ error: "Failed to access photo" }, { status: 500 });
    }

    // ── Step 1: Claude Vision scene analysis ──
    // Claude sees the venue photo + floor plan data and writes a spatially-aware prompt
    const floorPlanItems: FloorPlanItem[] = Array.isArray(floorPlanData) ? floorPlanData : [];

    const sceneResult = await analyzeScene({
      venuePhotoUrl: signedData.signedUrl,
      floorPlanData: floorPlanItems,
      designDescription,
    });

    console.log("[generate] Claude prompt:", sceneResult.prompt.slice(0, 200) + "...");

    // Create the generation record
    const { data: genRecord, error: genErr } = await supabase
      .from("generated_images")
      .insert({
        project_id: projectId,
        venue_photo_id: venuePhotoId,
        status: "processing",
        prompt_used: sceneResult.prompt,
      })
      .select("id")
      .single();
    if (genErr || !genRecord) {
      return NextResponse.json({ error: "Failed to create generation record" }, { status: 500 });
    }

    // ── Step 2: Image generation with Replicate ──
    // Use the Claude-generated prompt with Flux Dev img2img
    const hasFloorPlan = floorPlanItems.length > 0;
    // With Claude's detailed architecture-aware prompt, we can use higher strength
    // because the prompt itself describes the venue structure. Floor plan layouts
    // need 0.80 to actually place furniture; style-only needs 0.65.
    const strength = hasFloorPlan ? 0.80 : 0.65;
    const result = await createGeneration({
      imageUrl: signedData.signedUrl,
      prompt: sceneResult.prompt,
      negativePrompt: sceneResult.negativePrompt,
      strength,
      guidanceScale: 7.5,
      controlnetMode: "canny",
    });

    // Update with replicate ID
    await supabase
      .from("generated_images")
      .update({ replicate_id: result.id })
      .eq("id", genRecord.id);

    // Track usage
    await supabase
      .from("generation_usage")
      .insert({
        user_id: user.id,
        project_id: projectId,
        credits_used: hasFloorPlan ? 2 : 1, // Claude + Replicate = 2 credits
        model_used: "flux-dev+claude",
      });

    return NextResponse.json({
      generationId: genRecord.id,
      replicateId: result.id,
      status: result.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[generate] error:", message, stack);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
