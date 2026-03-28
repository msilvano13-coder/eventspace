import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on /planner routes and auth pages, skip static files and API routes
    "/planner/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
