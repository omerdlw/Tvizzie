"use client";

import { useState, type FormEvent, type JSX } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import {
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { Cascade, Item } from "@/features/movie/stage";
import {
  SURFACE_FIELD,
  SURFACE_LEAD,
  SurfaceScene,
  surfaceButton,
} from "@/features/movie/components/surface";
import { Button, Icon, Textarea } from "@/ui";
import { REVIEW_EVENTS, REVIEW_MAX_LENGTH } from "../lib/constants";
import {
  saveListCommentAction,
  saveMovieReviewAction,
} from "../server/actions";
import type { ReviewInput } from "../lib/types";
import { getReviewValidationError } from "../lib/validation";
import { RatingSelector } from "./rating-selector";

type ReviewEditorData =
  | {
      kind: "movie";
      movieId: number;
      review: ReviewInput | null;
      onSaved?: (review: ReviewInput) => void;
      title: string;
    }
  | {
      kind: "list";
      listId: string;
      review: Pick<ReviewInput, "content"> | null;
      onSaved?: () => void;
      title: string;
    };

const SURFACE_WIDTH = 560;

export function createReviewEditorSurfaceEntry(
  data: ReviewEditorData,
): SurfaceEntry {
  const editing = data.review !== null;
  const noun = data.kind === "list" ? "Comment" : "Review";
  return {
    component: ReviewEditorSurface,
    description: data.title,
    icon: "solar:pen-new-square-bold",
    props: { data },
    title: `${editing ? "Edit" : "Add"} ${noun}`,
    width: SURFACE_WIDTH,
  };
}

function primaryLabel({
  editing,
  isList,
  ratingOnly,
}: {
  editing: boolean;
  isList: boolean;
  ratingOnly: boolean;
}): string {
  if (isList) return editing ? "Update Comment" : "Publish Comment";
  if (editing) return ratingOnly ? "Update Rating" : "Update Review";
  return ratingOnly ? "Save Rating" : "Publish Review";
}

function ReviewEditorSurface({
  data,
}: {
  data: ReviewEditorData;
}): JSX.Element {
  const toast = useToast();
  const { closeSurface } = useDockActions();
  const isList = data.kind === "list";
  const editing = data.review !== null;

  const [content, setContent] = useState(data.review?.content ?? "");
  const [rating, setRating] = useState<number | null>(
    data.kind === "movie" ? (data.review?.rating ?? null) : null,
  );
  const [isSpoiler, setIsSpoiler] = useState(
    data.kind === "movie" ? Boolean(data.review?.isSpoiler) : false,
  );
  const [saving, setSaving] = useState(false);

  const text = content.trim();
  const problem = getReviewValidationError({
    allowRating: !isList,
    content,
    rating,
    requireText: isList,
    textLabel: isList ? "comment" : "review",
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (problem) {
      toast(problem);
      return;
    }

    setSaving(true);
    try {
      if (data.kind === "list") {
        const result = await saveListCommentAction(data.listId, text);
        if (!result.success) throw new Error(result.error);
        data.onSaved?.();
      } else {
        const next: ReviewInput = {
          content: text,
          isSpoiler: text ? isSpoiler : false,
          rating,
        };
        const result = await saveMovieReviewAction(data.movieId, next);
        if (!result.success) throw new Error(result.error);
        data.onSaved?.(next);
      }
      globalEvents.emit(REVIEW_EVENTS.CHANGE, { reason: "save" });
      closeSurface?.();
    } catch (error) {
      report("ReviewEditorSurface save", error);
      toast(toUserMessage(error, { fallback: "Could not save" }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SurfaceScene>
      <form onSubmit={submit}>
        <Cascade className="flex w-full flex-col gap-3" lead={SURFACE_LEAD}>
          {!isList ? (
            <Item
              className="flex w-full items-center justify-center pb-2"
              from="scale"
            >
              <RatingSelector
                disabled={saving}
                onChange={setRating}
                value={rating}
              />
            </Item>
          ) : null}

          <Item className="relative w-full" from="up">
            <Textarea
              aria-label={isList ? "Comment" : "Review"}
              className={`${SURFACE_FIELD} min-h-[130px] w-full p-4 pb-9 text-sm leading-normal`}
              disabled={saving}
              maxHeight={260}
              maxLength={REVIEW_MAX_LENGTH}
              minHeight={130}
              onChange={(event) => {
                setContent(event.target.value);
                if (!event.target.value.trim()) setIsSpoiler(false);
              }}
              placeholder={
                isList
                  ? `Share your thoughts on ${data.title}`
                  : `Add your thoughts about ${data.title} (optional)`
              }
              value={content}
            />
            <div className="pointer-events-none absolute right-3.5 bottom-2.5 text-xs font-medium text-white/50 select-none">
              {problem && (text || rating !== null) ? (
                <span className="font-semibold text-red-400/80">{problem}</span>
              ) : text ? (
                <span>
                  {text.length} / {REVIEW_MAX_LENGTH}
                </span>
              ) : null}
            </div>
          </Item>

          <div className="flex w-full gap-3">
            {!isList ? (
              <Item className="min-w-0 flex-1" from="left">
                <Button
                  aria-checked={isSpoiler}
                  className={`${surfaceButton(Boolean(isSpoiler && text))} w-full`}
                  disabled={!text || saving}
                  onClick={() => setIsSpoiler((current) => !current)}
                  role="switch"
                >
                  <Icon icon="solar:eye-closed-linear" size={15} />
                  {isSpoiler && text ? "Contains Spoilers" : "Mark as Spoiler"}
                </Button>
              </Item>
            ) : null}
            <Item className="min-w-0 flex-1" from="right">
              <Button
                className={`${surfaceButton(true)} w-full`}
                disabled={Boolean(problem)}
                loading={saving}
                type="submit"
              >
                {primaryLabel({
                  editing,
                  isList,
                  ratingOnly: rating !== null && !text,
                })}
              </Button>
            </Item>
          </div>
        </Cascade>
      </form>
    </SurfaceScene>
  );
}
