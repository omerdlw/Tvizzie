"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { createSignInSurfaceEntry } from "@/features/auth";

export function useLikeToggle({
  count: initialCount,
  liked: initialLiked,
  name,
  save,
  signedIn,
}: {
  count: number;
  liked: boolean;
  name: string;
  save: (liked: boolean) => Promise<{ error?: string; success: boolean }>;
  signedIn: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { openSurface } = useDockActions();
  const [busy, startTransition] = useTransition();
  const [{ count, liked }, setOptimistic] = useOptimistic(
    { count: initialCount, liked: initialLiked },
    (_, next: { count: number; liked: boolean }) => next,
  );

  const toggle = () => {
    if (!signedIn) {
      void openSurface(
        createSignInSurfaceEntry({
          next: window.location.pathname + window.location.search,
        }),
      );
      return;
    }
    const next = !liked;
    startTransition(async () => {
      setOptimistic({
        count: Math.max(0, count + (next ? 1 : -1)),
        liked: next,
      });
      try {
        const result = await save(next);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (error) {
        report(name, error);
        toast(toUserMessage(error, { fallback: "Could not update your like" }));
      }
    });
  };

  return { busy, count, liked, toggle };
}
