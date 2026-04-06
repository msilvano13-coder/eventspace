import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeneration } from "@/lib/replicate";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const generationId = req.nextUrl.searchParams.get("id");
    if (!generationId) {
      return NextResponse.json({ error: "Missing generation ID" }, { status: 400 });
    }

    // Get the generation record (RLS ensures ownership)
    const { data: genRecord, error: genErr } = await supabase
      .from("generated_images")
      .select("id, replicate_id, status, storage_path, error_message")
      .eq("id", generationId)
      .single();
    if (genErr || !genRecord) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // If already complete or failed, return stored state
    if (genRecord.status === "complete" || genRecord.status === "failed") {
      let imageUrl: string | null = null;
      if (genRecord.storage_path) {
        const { data } = await supabase.storage
          .from("venue-renders")
          .createSignedUrl(genRecord.storage_path, 3600);
        imageUrl = data?.signedUrl ?? null;
      }
      return NextResponse.json({
        id: genRecord.id,
        status: genRecord.status,
        imageUrl,
        error: genRecord.error_message,
      });
    }

    // Poll Replicate
    if (!genRecord.replicate_id) {
      return NextResponse.json({ id: genRecord.id, status: "pending" });
    }

    const result = await getGeneration(genRecord.replicate_id);

    if (result.status === "succeeded" && result.output) {
      // Download the generated image and store it
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      const imageResponse = await fetch(outputUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const storagePath = `${user.id}/${genRecord.id}.webp`;

      const { error: uploadErr } = await supabase.storage
        .from("venue-renders")
        .upload(storagePath, imageBuffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (!uploadErr) {
        await supabase
          .from("generated_images")
          .update({
            status: "complete",
            storage_path: storagePath,
            generation_time_ms: result.metrics?.predict_time
              ? Math.round(result.metrics.predict_time * 1000)
              : null,
          })
          .eq("id", genRecord.id);

        const { data } = await supabase.storage
          .from("venue-renders")
          .createSignedUrl(storagePath, 3600);

        return NextResponse.json({
          id: genRecord.id,
          status: "complete",
          imageUrl: data?.signedUrl ?? null,
        });
      }
    }

    if (result.status === "failed") {
      await supabase
        .from("generated_images")
        .update({ status: "failed", error_message: result.error ?? "Unknown error" })
        .eq("id", genRecord.id);

      return NextResponse.json({
        id: genRecord.id,
        status: "failed",
        error: result.error,
      });
    }

    return NextResponse.json({
      id: genRecord.id,
      status: result.status === "starting" ? "processing" : result.status,
    });
  } catch (err) {
    console.error("[generate/status] error:", err);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
