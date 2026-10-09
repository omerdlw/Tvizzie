"use client";

import {
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type JSX,
} from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import { createSignInSurfaceEntry } from "@/features/auth";
import { Button, Icon, Loader } from "@/ui";
import { globalEvents } from "@omerdlw/base-framework/events";
import { REVIEW_EVENTS } from "../lib/constants";
import { deleteReviewAction, setReviewLikeAction } from "../server/actions";

export function ReviewBody({
  content,
  isSpoiler,
}: {
  content: string;
  isSpoiler: boolean;
}): JSX.Element {
  const [revealed, setRevealed] = useState(false);

  if (isSpoiler && !revealed) {
    return (
      <Button
        className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white"
        onClick={() => setRevealed(true)}
      >
        <Icon icon="solar:eye-closed-linear" size={14} />
        Contains spoilers, show anyway
      </Button>
    );
  }

  return (
    <p className="text-sm leading-relaxed whitespace-pre-line text-white/70">
      {content}
    </p>
  );
}

export function ReviewActions({
  id,
  isOwner,
  liked: initialLiked,
  likesCount,
  onEdit,
  plain = false,
  signedIn,
}: {
  id: string;
  isOwner: boolean;
  onEdit?: () => void;
  liked: boolean;
  likesCount: number;
  plain?: boolean;
  signedIn: boolean;
}): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const { openSurface } = useDockActions();
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();
  const [{ count, liked }, setOptimistic] = useOptimistic(
    { count: likesCount, liked: initialLiked },
    (_, next: { count: number; liked: boolean }) => next,
  );

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  const toggleLike = () => {
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
        const result = await setReviewLikeAction(id, next);
        if (!result.success) throw new Error(result.error);
        router.refresh();
        globalEvents.emit(REVIEW_EVENTS.CHANGE, { reason: "like" });
      } catch (error) {
        report("ReviewActions like", error);
        toast(toUserMessage(error, { fallback: "Could not update your like" }));
      }
    });
  };

  const remove = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      try {
        const result = await deleteReviewAction(id);
        if (!result.success) throw new Error(result.error);
        router.refresh();
        globalEvents.emit(REVIEW_EVENTS.CHANGE, { reason: "delete" });
      } catch (error) {
        report("ReviewActions delete", error);
        toast(
          toUserMessage(error, { fallback: "Could not delete this review" }),
        );
      }
      setConfirming(false);
    });
  };

  const like = plain
    ? cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-semibold disabled:cursor-wait",
        liked
          ? "text-[rgb(var(--grade,252_252_251))]"
          : "text-white/50 hover:text-white",
      )
    : cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ring-inset disabled:cursor-wait",
        liked
          ? "bg-success/20 text-success ring-success/30"
          : "text-white/70 ring-white/5 hover:bg-white/10 hover:text-white",
      );
  const round = plain
    ? "center size-8 cursor-pointer rounded-full text-white/40 hover:text-white"
    : "center size-8 cursor-pointer rounded-full text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white";
  const trash = plain
    ? confirming
      ? "center size-8 cursor-pointer rounded-full text-red-400 disabled:cursor-wait"
      : "center size-8 cursor-pointer rounded-full text-white/40 hover:text-white disabled:cursor-wait"
    : cn(
        "center size-8 cursor-pointer rounded-full ring-1 ring-inset disabled:cursor-wait",
        confirming
          ? "bg-red-600 text-white ring-red-400"
          : "text-white/70 ring-white/5 hover:bg-white/10 hover:text-white",
      );

  return (
    <div className="flex items-center gap-1.5">
      <Button
        aria-pressed={liked}
        className={like}
        disabled={busy}
        onClick={toggleLike}
      >
        <Icon
          icon={liked ? "solar:heart-bold" : "solar:heart-linear"}
          size={14}
        />
        {count}
      </Button>
      {isOwner && onEdit ? (
        <Button
          aria-label="Edit this review"
          className={round}
          disabled={busy}
          onClick={onEdit}
        >
          <Icon icon="solar:pen-bold" size={14} />
        </Button>
      ) : null}
      {isOwner ? (
        <Button
          aria-label={
            confirming ? "Confirm deleting this review" : "Delete this review"
          }
          className={trash}
          disabled={busy}
          loader={<Loader size={20} />}
          loading={busy && confirming}
          onClick={remove}
        >
          <Icon
            icon={
              confirming
                ? "solar:check-read-linear"
                : "solar:trash-bin-trash-bold"
            }
            size={14}
          />
        </Button>
      ) : null}
    </div>
  );
}
