import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateOrigin, isRateLimited, getClientIp } from "@/lib/api-security";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // CSRF protection
    const csrfError = validateOrigin(request);
    if (csrfError) return csrfError;

    // Rate limiting
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp, { name: "signed-url", max: 30, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { shareToken, bucket, path } = body;

    if (!shareToken || !bucket || !path) {
      return NextResponse.json(
        { error: "Missing required fields: shareToken, bucket, path" },
        { status: 400 }
      );
    }

    // Whitelist allowed buckets
    const ALLOWED_BUCKETS = ["event-files"];
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json(
        { error: "Invalid bucket" },
        { status: 400 }
      );
    }

    // Normalize URL-encoded variants before traversal check
    const decodedPath = decodeURIComponent(path);

    // Validate path against traversal attacks
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

    // Validate the share token by looking up the event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("user_id")
      .eq("share_token", shareToken)
      .single();

    if (eventError || !event) {
      console.error("Invalid share token:", eventError);
      return NextResponse.json(
        { error: "Invalid share token" },
        { status: 401 }
      );
    }

    const plannerId = event.user_id;

    // Auto-prefix the planner's user_id if not already present (client portal doesn't know the user_id)
    const resolvedPath = path.startsWith(`${plannerId}/`) ? path : `${plannerId}/${path}`;

    // Validate resolved path starts with the planner's user_id (defence-in-depth)
    if (!resolvedPath.startsWith(`${plannerId}/`)) {
      return NextResponse.json(
        { error: "Path does not match the expected planner scope" },
        { status: 403 }
      );
    }

    // Create a signed URL with 1-hour expiry using the service role client
    const { data: signedUrlData, error: signedUrlError } =
      await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(resolvedPath, 3600);

    if (signedUrlError || !signedUrlData) {
      console.error("Signed URL error:", signedUrlError);
      return NextResponse.json(
        { error: "Failed to create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (error) {
    console.error("Unexpected error in storage signed-url:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
