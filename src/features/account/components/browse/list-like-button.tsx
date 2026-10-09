"use client";

import { useOptimistic, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import { createSignInSurfaceEntry } from "@/features/auth";
import { Button, Icon } from "@/ui";
import { setListLikeAction } from "../../server/browse-actions";

export function ListLikeButton({
  liked: initialLiked,
  listId,
  likesCount,
  signedIn,
}: {
  liked: boolean;
  likesCount: number;
  listId: string;
  signedIn: boolean;
}): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { openSurface } = useDockActions();
  const [busy, startTransition] = useTransition();
  const [{ count, liked }, setOptimistic] = useOptimistic(
    { count: likesCount, liked: initialLiked },
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
        const result = await setListLikeAction(listId, next);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (error) {
        report("ListLikeButton", error);
        toast(toUserMessage(error, { fallback: "Could not update your like" }));
      }
    });
  };

  return (
    <Button
      aria-pressed={liked}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-[13px] px-3.5 text-xs font-bold uppercase ring-1 ring-inset disabled:cursor-wait",
        liked
          ? "bg-success/20 text-success ring-success/30 hover:bg-success/30"
          : "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white",
      )}
      disabled={busy}
      onClick={toggle}
    >
      <Icon
        icon={liked ? "solar:heart-bold" : "solar:heart-linear"}
        size={15}
      />
      {liked ? "Liked" : "Like"}
      <span className="font-mono text-[11px] opacity-70">{count}</span>
    </Button>
  );
}
