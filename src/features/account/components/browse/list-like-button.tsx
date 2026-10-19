"use client";

import { useOptimistic, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
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
  const actionClass = useDockActionClass();
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
      aria-label={liked ? "Unlike this list" : "Like this list"}
      aria-pressed={liked}
      className={actionClass({
        className:
          "w-auto shrink-0 gap-1.5 px-3.5 backdrop-blur-sm disabled:cursor-wait",
        isActive: liked,
      })}
      disabled={busy}
      onClick={toggle}
      type="button"
    >
      <Icon
        className={liked ? "text-rose-400" : undefined}
        icon={liked ? "solar:heart-bold" : "solar:heart-linear"}
        size={16}
      />
      <span className="tabular-nums">{count}</span>
    </Button>
  );
}
