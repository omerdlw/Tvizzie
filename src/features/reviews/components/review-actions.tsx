"use client";

import { useState, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import { Button, Icon, useConfirmStep } from "@/ui";
import { globalEvents } from "@omerdlw/base-framework/events";
import { REVIEW_EVENTS } from "../lib/constants";
import { useLikeToggle } from "../lib/use-like-toggle";
import { deleteReviewAction, setReviewLikeAction } from "../server/actions";

export function ReviewBody({
  content,
  isSpoiler,
  revealClassName,
}: {
  content: string;
  isSpoiler: boolean;
  revealClassName?: string;
}): JSX.Element {
  const [revealed, setRevealed] = useState(false);

  if (isSpoiler && !revealed) {
    return (
      <Button
        className={cn(
          "inline-flex w-fit cursor-pointer items-center gap-1.5 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white",
          revealClassName,
        )}
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
  signedIn,
}: {
  id: string;
  isOwner: boolean;
  onEdit?: () => void;
  liked: boolean;
  likesCount: number;
  signedIn: boolean;
}): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useConfirmStep();
  const [busy, startTransition] = useTransition();
  const likes = useLikeToggle({
    count: likesCount,
    liked: initialLiked,
    name: "ReviewActions like",
    save: async (next) => {
      const result = await setReviewLikeAction(id, next);
      if (result.success) {
        globalEvents.emit(REVIEW_EVENTS.CHANGE, { reason: "like" });
      }
      return result;
    },
    signedIn,
  });
  const { count, liked } = likes;

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

  const like = cn(
    "inline-flex h-8 cursor-pointer items-center gap-1.5 px-2 text-xs font-semibold disabled:cursor-wait",
    liked
      ? "text-[rgb(var(--grade,252_252_251))]"
      : "text-white/50 hover:text-white",
  );
  const round = "center size-8 cursor-pointer text-white/40 hover:text-white";
  const trash = confirming
    ? "center size-8 cursor-pointer text-red-400 disabled:cursor-wait"
    : "center size-8 cursor-pointer text-white/40 hover:text-white disabled:cursor-wait";

  return (
    <div className="flex items-center gap-1.5">
      <Button
        aria-pressed={liked}
        className={like}
        disabled={busy || likes.busy}
        onClick={likes.toggle}
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
          disabled={busy || likes.busy}
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
          disabled={busy || likes.busy}
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
