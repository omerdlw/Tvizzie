"use client";

import { useMemo, type JSX } from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockRegistration,
} from "@omerdlw/base-framework/modules/dock";
import { movieHref } from "@/config/routes";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { Button, Icon } from "@/ui";
import type { Feature } from "../lib/types";

const FALLBACK_ICON = "solar:clapperboard-play-bold";

// While the hero is on screen the dock carries the film it projects.
export function FilmDock({
  film,
  shown,
}: {
  film: Feature;
  shown: boolean;
}): null {
  const action = useMemo(
    () => <OpenFilm id={film.id} title={film.title} />,
    [film.id, film.title],
  );

  const config = useMemo(
    () =>
      shown
        ? {
            action,
            description:
              [film.year, ...film.genres].filter(Boolean).join(" · ") ||
              undefined,
            icon:
              tmdbImageUrl("poster", film.posterPath, "w185") ?? FALLBACK_ICON,
            path: "/",
            title: film.title,
          }
        : null,
    [action, film, shown],
  );

  useDockRegistration(config);
  return null;
}

function OpenFilm({ id, title }: { id: number; title: string }): JSX.Element {
  const actionClass = useDockActionClass();
  const { navigate } = useDockActions();

  return (
    <Button
      aria-label={`Open ${title}`}
      className={actionClass({ className: "w-full" })}
      onClick={() => void navigate(movieHref(id))}
      type="button"
    >
      <Icon icon="solar:play-bold" size={16} />
      <span className="truncate">Open film</span>
    </Button>
  );
}
