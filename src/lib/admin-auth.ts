import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/api-security";

const ADMIN_EMAIL = "ashley@ashleysilvanohair.com";

export async function validateAdminRequest(request: Request) {
  // CSRF protection for non-GET requests
  const csrfError = validateOrigin(request);
  if (csrfError) return { error: csrfError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (user.email !== ADMIN_EMAIL) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user };
}
