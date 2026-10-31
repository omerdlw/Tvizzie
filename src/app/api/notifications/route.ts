import { NextResponse } from "next/server";
import { UserError } from "@omerdlw/base-framework/utils";
import { requireUser } from "@/features/auth/server";
import { apiErrorResponse } from "@/infrastructure/http/api-error";
import { rateLimitResponse } from "@/infrastructure/security/rate-limiter";
import { assertSameOrigin } from "@/infrastructure/security/same-origin";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";

const DONE = { success: true };

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const client = await createServerSupabaseClient();

    if (params.get("resource") === "unread-count") {
      const { count, error } = await client
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
      return NextResponse.json({ data: count ?? 0 });
    }

    const limit = Math.min(
      Math.max(1, Number(params.get("limitCount")) || 50),
      100,
    );
    const { data, error } = await client
      .from("notifications")
      .select(
        "*, actor:accounts!notifications_actor_id_fkey(id, username, display_name, avatar_url, banner_url)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const limited = await rateLimitResponse(
      `notifications:patch:${user.id}`,
      60,
    );
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const unread = (await createServerSupabaseClient())
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (body.action === "mark-read" && body.notificationId) {
      const { error } = await unread.eq("id", body.notificationId);
      if (error) throw error;
      return NextResponse.json(DONE);
    }
    if (body.action === "mark-all-read") {
      const { error } = await unread.eq("read", false);
      if (error) throw error;
      return NextResponse.json(DONE);
    }
    throw new UserError("Invalid notification patch action", 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const limited = await rateLimitResponse(
      `notifications:delete:${user.id}`,
      60,
    );
    if (limited) return limited;

    const params = new URL(request.url).searchParams;
    const action = params.get("action");
    const notificationId = params.get("notificationId");
    const owned = (await createServerSupabaseClient())
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (action === "delete" && notificationId) {
      const { error } = await owned.eq("id", notificationId);
      if (error) throw error;
      return NextResponse.json(DONE);
    }
    if (action === "delete-all") {
      const { error } = await owned;
      if (error) throw error;
      return NextResponse.json(DONE);
    }
    throw new UserError("Invalid notification delete action", 400);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
