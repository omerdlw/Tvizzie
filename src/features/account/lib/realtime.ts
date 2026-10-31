"use client";

import { useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { globalEvents } from "@omerdlw/base-framework/events";
import { report } from "@omerdlw/base-framework/utils";
import { useAuth } from "@/features/auth";
import { isSupabaseConfigured } from "@/infrastructure/env";
import {
  createBrowserSupabaseClient,
  type Database,
} from "@/infrastructure/supabase/client";
import { SOCIAL_EVENTS } from "./constants";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

const DEBOUNCE_MS = 80;
const INBOX_TYPES = new Set(["FOLLOW_REQUEST", "FOLLOW_ACCEPTED"]);

function changedRow<T extends Record<string, unknown>>(
  payload: RealtimePostgresChangesPayload<T>,
): Partial<T> {
  return payload.eventType === "DELETE" ? payload.old : payload.new;
}

export function SocialRealtimeSync(): null {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const accessToken = auth.session?.access_token ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured() || !auth.isAuthenticated || !userId) return;

    const supabase = createBrowserSupabaseClient();
    const refreshInbox = () =>
      globalEvents.emitDebounced(
        SOCIAL_EVENTS.INBOX_CHANGE,
        undefined,
        DEBOUNCE_MS,
      );

    try {
      if (accessToken) void supabase.realtime.setAuth(accessToken);
      const channel = supabase
        .channel(`social:user:${userId}`)
        .on<Row<"notifications">>(
          "postgres_changes",
          {
            event: "*",
            filter: `user_id=eq.${userId}`,
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            globalEvents.emitDebounced(
              SOCIAL_EVENTS.NOTIFICATION_CHANGE,
              undefined,
              DEBOUNCE_MS,
            );
            const type = changedRow(payload).type;
            if (type && INBOX_TYPES.has(type)) refreshInbox();
          },
        )
        .on<Row<"account_follows">>(
          "postgres_changes",
          { event: "*", schema: "public", table: "account_follows" },
          (payload) => {
            const { follower_id, following_id, status } = changedRow(payload);
            if (following_id === userId) refreshInbox();
            if (following_id !== userId && follower_id !== userId) return;
            globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
              followerId: follower_id ?? null,
              followingId: following_id ?? null,
              status: payload.eventType === "DELETE" ? null : (status ?? null),
            });
          },
        )
        .subscribe();

      return () => void supabase.removeChannel(channel);
    } catch (error) {
      report("Social realtime init", error, "warn");
    }
  }, [accessToken, auth.isAuthenticated, userId]);

  return null;
}
