"use client";

import type { JSX } from "react";
import { useDockActionClass } from "@omerdlw/base-framework/modules/dock";
import { useLikeToggle } from "@/features/reviews";
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
  const actionClass = useDockActionClass();
  const { busy, count, liked, toggle } = useLikeToggle({
    count: likesCount,
    liked: initialLiked,
    name: "ListLikeButton",
    save: (next) => setListLikeAction(listId, next),
    signedIn,
  });

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
        className={
          liked ? "ui-develop center text-rose-400" : "ui-develop center"
        }
        icon={liked ? "solar:heart-bold" : "solar:heart-linear"}
        key={liked ? "liked" : "unliked"}
        size={16}
      />
      <span className="ui-develop tabular-nums" key={count}>
        {count}
      </span>
    </Button>
  );
}
