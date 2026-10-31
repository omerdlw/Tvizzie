"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { ReviewActions, ReviewBody } from "@/features/reviews";
import { createReviewEditorSurfaceEntry } from "@/features/reviews";
import { Avatar } from "@/ui";
import type { ListComment } from "../../lib/browse-data";
import { AccountLink } from "./account-link";
import { accountHref } from "@/config/routes";

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
      <p className="py-10 text-center text-sm text-white/50">No comments yet</p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-white/[0.06]">
      {comments.map((comment) => {
        const profile = accountHref(comment.author.username);
        return (
          <li className="flex py-6 first:pt-0 last:pb-0" key={comment.id}>
            <article className="flex w-full flex-col gap-3">
              <div className="flex items-center gap-3.5">
                <AccountLink className="flex shrink-0" href={profile}>
                  <Avatar
                    className="rounded-full"
                    name={comment.author.displayName}
                    size={44}
                    src={comment.author.avatarUrl ?? undefined}
                  />
                </AccountLink>
                <div className="flex min-w-0 flex-col gap-1">
                  <AccountLink
                    className="truncate text-base font-semibold text-white underline decoration-transparent hover:decoration-current"
                    href={profile}
                  >
                    {comment.author.displayName}
                  </AccountLink>
                  <time
                    className="text-xs font-semibold text-white/50"
                    dateTime={comment.createdAt}
                  >
                    {DATE.format(new Date(comment.createdAt))}
                  </time>
                </div>
                <div className="-mr-2 ml-auto shrink-0">
                  <ReviewActions
                    id={comment.id}
                    isOwner={comment.author.id === viewerId}
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

              <div className="[&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-white/70">
                <ReviewBody content={comment.content} isSpoiler={false} />
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
