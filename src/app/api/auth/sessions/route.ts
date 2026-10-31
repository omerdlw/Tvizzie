import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server";
import { apiErrorResponse } from "@/infrastructure/http/api-error";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";

export async function GET() {
  try {
    const user = await requireUser();
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("auth_sessions")
      .select("session_id,user_agent,ip_address,created_at,last_seen_at")
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({
      sessions: data.map((session) => ({
        ...session,
        is_current: session.session_id === user.sessionId,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
