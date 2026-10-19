"use client";

import { useMemo } from "react";
import { ListCommentAction } from "@/features/reviews/components/list-comment-action";
import { useAccountDock } from "../account-dock";
import type { ListDetail } from "../../lib/browse-data";
import { ListLikeButton } from "./list-like-button";
import { EditListAction } from "./list-owner-actions";
import { counted } from "./section";

// A list's page puts the list itself on the dock: its title and what it is,
// a like on the left of the comment and, for its owner, an edit on the right.
export function ListChrome({
  comment,
  icon,
  isOwner,
  list,
  signedIn,
}: {
  comment: string | null;
  icon: string | null;
  isOwner: boolean;
  list: ListDetail;
  signedIn: boolean;
}): null {
  const {
    description,
    id,
    isPrivate,
    isRanked,
    itemsCount,
    liked,
    likesCount,
    owner,
    slug,
    title,
  } = list;

  const dock = useMemo(
    () => ({
      action: (
        <div className="flex w-full items-center gap-2.5">
          <ListLikeButton
            liked={liked}
            likesCount={likesCount}
            listId={id}
            signedIn={signedIn}
          />
          <div className="min-w-0 flex-1">
            <ListCommentAction
              target={{ content: comment, listId: id, title }}
            />
          </div>
          {isOwner ? (
            <EditListAction
              list={{ description, id, isPrivate, isRanked, slug, title }}
              username={owner.username}
            />
          ) : null}
        </div>
      ),
      description:
        description.trim().split("\n")[0] ||
        `${counted(itemsCount, "film")} · by ${owner.displayName}`,
      icon: icon ?? "solar:list-bold",
      title,
    }),
    [
      comment,
      description,
      icon,
      id,
      isOwner,
      isPrivate,
      isRanked,
      itemsCount,
      liked,
      likesCount,
      owner.displayName,
      owner.username,
      signedIn,
      slug,
      title,
    ],
  );
  useAccountDock(dock);
  return null;
}
