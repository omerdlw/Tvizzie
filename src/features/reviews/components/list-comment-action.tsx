"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { Button, Icon } from "@/ui";
import { createReviewEditorSurfaceEntry } from "./review-editor-surface";

interface ListCommentTarget {
  content: string | null;
  listId: string;
  title: string;
}

export function ListCommentAction({
  target,
}: {
  target: ListCommentTarget;
}): JSX.Element | null {
  const auth = useAuth();
  const router = useRouter();
  const actionClass = useDockActionClass();
  const { openSurface } = useDockActions();
  if (!auth.isReady) return null;

  const editing = target.content !== null;

  const open = () => {
    if (!auth.isAuthenticated) {
      void openSurface(
        createSignInSurfaceEntry({
          next: window.location.pathname + window.location.search,
        }),
      );
      return;
    }
    void openSurface(
      createReviewEditorSurfaceEntry({
        kind: "list",
        listId: target.listId,
        onSaved: () => router.refresh(),
        review: editing ? { content: target.content ?? "" } : null,
        title: target.title,
      }),
    );
  };

  return (
    <Button
      className={actionClass({ className: "w-full backdrop-blur-sm" })}
      onClick={open}
      type="button"
    >
      <Icon
        icon={editing ? "solar:pen-bold" : "solar:chat-round-bold"}
        size={16}
      />
      <span className="truncate">
        {editing ? "Edit Comment" : "Add Comment"}
      </span>
    </Button>
  );
}
