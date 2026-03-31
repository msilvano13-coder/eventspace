import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited, getClientIp } from "@/lib/api-security";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/storage/wedding-image — Generate a signed URL for a wedding page image.
 * Uses wedding slug (public knowledge) instead of shareToken (grants write access).
 * Only works for enabled wedding pages and scoped to the event owner's storage path.
 */
export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    if (await isRateLimited(clientIp, { name: "wedding-image", max: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { slug, path } = body;

    if (!slug || !path) {
      return NextResponse.json(
        { error: "Missing required fields: slug, path" },
        { status: 400 }
      );
    }

    // Validate path against traversal attacks
    const decodedPath = decodeURIComponent(path);
    if (
      decodedPath.includes("..") ||
      decodedPath.includes("\\") ||
      decodedPath.includes("\0") ||
      decodedPath.startsWith("/")
    ) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }

    // Look up the event by wedding slug — must be an enabled wedding page
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("user_id")
      .eq("wedding_slug", slug)
      .eq("wedding_page_enabled", true)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Wedding page not found" },
        { status: 404 }
      );
    }

    const plannerId = event.user_id;

    // Auto-prefix the planner's user_id if not already present
    const resolvedPath = path.startsWith(`${plannerId}/`) ? path : `${plannerId}/${path}`;

    // Validate resolved path is scoped to the planner
    if (!resolvedPath.startsWith(`${plannerId}/`)) {
      return NextResponse.json(
        { error: "Path does not match the expected planner scope" },
        { status: 403 }
      );
    }

    // Create a signed URL with 1-hour expiry
    const { data: signedUrlData, error: signedUrlError } =
      await supabaseAdmin.storage
        .from("event-files")
        .createSignedUrl(resolvedPath, 3600);

    if (signedUrlError || !signedUrlData) {
      console.error("Wedding image signed URL error:", signedUrlError);
      return NextResponse.json(
        { error: "Failed to create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (error) {
    console.error("Unexpected error in wedding-image route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
