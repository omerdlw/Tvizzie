"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { ReviewActions } from "@/features/reviews/components/review-actions";
import { createReviewEditorSurfaceEntry } from "@/features/reviews/components/review-editor-surface";
import { Avatar } from "@/ui";
import type { ListComment } from "../../lib/browse-data";
import { AccountLink } from "./account-link";

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function ListComments({
  comments,
  listId,
  listTitle,
  viewerId,
}: {
  comments: readonly ListComment[];
  listId: string;
  listTitle: string;
  viewerId: string | null;
}): JSX.Element {
  const router = useRouter();
  const { openSurface } = useDockActions();

  if (comments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-white/40">No comments yet</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {comments.map((comment) => {
        const profile = `/account/${encodeURIComponent(comment.author.username)}`;
        const isOwn = comment.author.id === viewerId;
        return (
          <li
            className="flex gap-3 rounded-[20px] bg-white/5 p-3.5 ring-1 ring-white/5 ring-inset"
            key={comment.id}
          >
            <AccountLink href={profile}>
              <Avatar
                name={comment.author.displayName}
                size={36}
                src={comment.author.avatarUrl ?? undefined}
              />
            </AccountLink>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <AccountLink
                  className="text-sm font-semibold text-white hover:underline"
                  href={profile}
                >
                  {comment.author.displayName}
                </AccountLink>
                <time
                  className="text-xs text-white/40"
                  dateTime={comment.createdAt}
                >
                  {DATE.format(new Date(comment.createdAt))}
                </time>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line text-white/70">
                {comment.content}
              </p>
              <div className="mt-1 self-end">
                <ReviewActions
                  id={comment.id}
                  isOwner={isOwn}
                  liked={comment.liked}
                  likesCount={comment.likesCount}
                  onEdit={() =>
                    void openSurface(
                      createReviewEditorSurfaceEntry({
                        kind: "list",
                        listId,
                        onSaved: () => router.refresh(),
                        review: { content: comment.content },
                        title: listTitle,
                      }),
                    )
                  }
                  signedIn={viewerId !== null}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
