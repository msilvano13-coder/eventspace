import { NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await validateAdminRequest(request);
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("contract_audit_log")
    .select("id, event_id, contract_id, actor_type, action, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }

  return NextResponse.json({ entries: data || [] });
}
