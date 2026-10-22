import { NextResponse } from "next/server";
import { UserError } from "@omerdlw/base-framework/utils";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { assertSameOrigin } from "@/infrastructure/security/url-safety";
import { getOptionalUser, requireUser } from "@/features/auth/server/server";
import {
  checkRateLimitAsync,
  createRateLimitExceededResponse,
  getClientIp,
} from "@/infrastructure/security/rate-limiter";
import { apiErrorResponse } from "@/infrastructure/http/api-error";

function failure(error: unknown): NextResponse {
  return apiErrorResponse(error);
}

const FOLLOW_PAGE_SIZE = 50;
const REQUESTS_LIMIT = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cursorTime(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

interface ProfileRow {
  avatar_url: string | null;
  banner_url: string | null;
  display_name: string | null;
  username: string | null;
}

function toSocialUser(
  id: string,
  profile: ProfileRow | null | undefined,
  createdAt: string,
) {
  return {
    avatarUrl: profile?.avatar_url || null,
    bannerUrl: profile?.banner_url || null,
    createdAt,
    displayName: profile?.display_name || profile?.username || "Anonymous User",
    id,
    username: profile?.username || null,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await getOptionalUser();
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    const followingId = url.searchParams.get("followingId");
    const targetUserId = url.searchParams.get("userId") || user?.id;
    const client = await createServerSupabaseClient();

    if (resource === "inbox-count") {
      if (!user) return NextResponse.json({ count: 0 });
      const { count, error } = await client
        .from("account_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id)
        .eq("status", "pending");

      if (error) throw error;
      return NextResponse.json({ count: count ?? 0 });
    }

    if (resource === "requests" || resource === "inbox") {
      if (!user) return NextResponse.json({ data: [] });
      const { data: rows, error } = await client
        .from("account_follows")
        .select(
          "follower_id, created_at, follower:accounts!account_follows_follower_id_fkey(username, display_name, avatar_url, banner_url)",
        )
        .eq("following_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(REQUESTS_LIMIT);

      if (error) throw error;
      return NextResponse.json({
        data: (rows ?? []).map((row) =>
          toSocialUser(row.follower_id, row.follower, row.created_at),
        ),
      });
    }

    // A page of followers or following, newest first. `next` is where the
    // following page starts; the first page also carries the totals.
    if (resource === "followers" || resource === "following") {
      if (!targetUserId || !UUID.test(targetUserId)) {
        return NextResponse.json({ data: [], next: null, total: 0 });
      }
      const before = cursorTime(url.searchParams.get("before"));
      const beforeId = url.searchParams.get("beforeId");

      const [page, counts] = await Promise.all([
        client.rpc("get_account_follows", {
          p_account_id: targetUserId,
          p_before: before,
          p_before_id: beforeId && UUID.test(beforeId) ? beforeId : null,
          p_direction: resource,
          p_limit: FOLLOW_PAGE_SIZE,
        }),
        before
          ? null
          : client.rpc("get_account_follow_counts", {
              p_account_id: targetUserId,
            }),
      ]);

      if (page.error?.code === "42501") {
        return NextResponse.json(
          { error: "This account is private" },
          { status: 403 },
        );
      }
      if (page.error) throw page.error;

      const rows = page.data ?? [];
      const last =
        rows.length === FOLLOW_PAGE_SIZE ? rows[rows.length - 1] : null;
      const totals = counts?.data?.[0];

      return NextResponse.json({
        data: rows.map((row) => ({
          ...toSocialUser(row.account_id, row, row.followed_at),
          viewerStatus: row.viewer_status,
        })),
        next: last
          ? { before: last.followed_at, beforeId: last.follow_id }
          : null,
        total: totals
          ? resource === "followers"
            ? totals.followers_count
            : totals.following_count
          : null,
      });
    }

    if (!user || !followingId) return NextResponse.json({ status: null });
    const { data, error } = await client
      .from("account_follows")
      .select("status")
      .eq("follower_id", user.id)
      .eq("following_id", followingId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ status: data?.status || null });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimitAsync(
      `social:follows:patch:${user.id || clientIp}`,
      {
        limit: 60,
        windowMs: 60 * 1000,
      },
    );
    if (!rateLimit.success) {
      return createRateLimitExceededResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const requesterId = String(body?.requesterId || "");
    if (!requesterId) throw new UserError("Requester ID is required", 400);

    const client = await createServerSupabaseClient();

    if (body.action === "accept") {
      const { error } = await client
        .from("account_follows")
        .update({ status: "accepted" })
        .eq("following_id", user.id)
        .eq("follower_id", requesterId);

      if (error) throw error;
      return NextResponse.json({ status: "accepted", success: true });
    }

    if (body.action === "reject") {
      const { error } = await client
        .from("account_follows")
        .delete()
        .eq("following_id", user.id)
        .eq("follower_id", requesterId);

      if (error) throw error;
      return NextResponse.json({ status: null, success: true });
    }

    throw new UserError("Invalid follow patch action", 400);
  } catch (error) {
    return failure(error);
  }
}

async function resolveFollow(
  request: Request,
  method: "POST" | "DELETE",
): Promise<Response | { status: string | null; success?: boolean }> {
  assertSameOrigin(request);
  const user = await requireUser();
  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimitAsync(
    `social:follows:mutate:${user.id || clientIp}`,
    {
      limit: 45,
      windowMs: 60 * 1000,
    },
  );
  if (!rateLimit.success) {
    return createRateLimitExceededResponse(rateLimit);
  }

  const payload = await request.json().catch(() => ({}));
  const client = await createServerSupabaseClient();

  if (method === "DELETE") {
    const isRemoveFollower =
      payload?.action === "remove-follower" || Boolean(payload?.followerId);

    if (isRemoveFollower) {
      const followerId = String(
        payload?.followerId ||
          payload?.targetUserId ||
          payload?.followingId ||
          "",
      );
      if (!followerId || followerId === user.id) {
        throw new UserError("Invalid follow target", 400);
      }

      const { error } = await client
        .from("account_follows")
        .delete()
        .eq("following_id", user.id)
        .eq("follower_id", followerId);

      if (error) throw error;
      return { status: null, success: true };
    }

    const followingId = String(
      payload?.followingId || payload?.targetUserId || payload?.userId || "",
    );
    if (!followingId || followingId === user.id) {
      throw new UserError("Invalid follow target", 400);
    }

    const { error } = await client
      .from("account_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);

    if (error) throw error;
    return { status: null, success: true };
  }

  const followingId = String(
    payload?.followingId || payload?.targetUserId || "",
  );
  if (!followingId || followingId === user.id) {
    throw new UserError("Invalid follow target", 400);
  }

  const { data: targetRows, error: targetError } = await client.rpc(
    "get_account_follow_target",
    { p_user_id: followingId },
  );
  if (targetError) throw targetError;
  const target = targetRows?.[0] as { is_private?: boolean } | undefined;
  if (!target) throw new UserError("Account not found", 404);

  const status = target.is_private ? "pending" : "accepted";
  const { error } = await client
    .from("account_follows")
    .upsert(
      { follower_id: user.id, following_id: followingId, status },
      { onConflict: "follower_id,following_id" },
    );
  if (error) throw error;
  return { status };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const result = await resolveFollow(request, "POST");
    if (result instanceof Response) return result;
    return NextResponse.json(result);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const result = await resolveFollow(request, "DELETE");
    if (result instanceof Response) return result;
    return NextResponse.json(result);
  } catch (error) {
    return failure(error);
  }
}
