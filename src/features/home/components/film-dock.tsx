"use client";

import { useCallback, useMemo, type JSX, type ReactNode } from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockRegistration,
} from "@omerdlw/base-framework/modules/dock";
import { movieHref, personHref } from "@config/routes";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { Button, Icon } from "@/ui";
import type { Director, HomeMovie } from "../lib/types";

const FALLBACK_ICON = "solar:clapperboard-play-bold";

// While a section has a film in front of the camera the home card speaks for
// it; between sections the static home card comes back. A section may put
// its own buttons on the card and say something else about the film.
export function FilmDock({
  action: custom,
  description,
  film,
  shown,
}: {
  action?: ReactNode;
  description?: string;
  film: HomeMovie;
  shown: boolean;
}): null {
  const open = useMemo(
    () => <OpenFilm id={film.id} title={film.title} />,
    [film.id, film.title],
  );
  const action = custom ?? open;

  const config = useMemo(
    () =>
      shown
        ? {
            action,
            description:
              description ??
              ([film.year, ...film.genres].filter(Boolean).join(" · ") ||
                undefined),
            icon:
              tmdbImageUrl("poster", film.posterPath, "w185") ?? FALLBACK_ICON,
            path: "/",
            title: film.title,
          }
        : null,
    [action, description, film, shown],
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

// The same card for a person: their portrait, and a way to their page.
export function DirectorDock({
  description,
  director,
  shown,
}: {
  description: string;
  director: Director;
  shown: boolean;
}): null {
  const action = useMemo(
    () => <OpenPerson id={director.id} name={director.name} />,
    [director.id, director.name],
  );

  const config = useMemo(
    () =>
      shown
        ? {
            action,
            description,
            icon:
              tmdbImageUrl("profile", director.profilePath, "w185") ??
              FALLBACK_ICON,
            path: "/",
            title: director.name,
          }
        : null,
    [action, description, director, shown],
  );

  useDockRegistration(config);
  return null;
}

function OpenPerson({ id, name }: { id: number; name: string }): JSX.Element {
  const actionClass = useDockActionClass();
  const { navigate } = useDockActions();

  return (
    <Button
      aria-label={`Open ${name}`}
      className={actionClass({ className: "w-full" })}
      onClick={() => void navigate(personHref(id))}
      type="button"
    >
      <Icon icon="solar:user-rounded-bold" size={16} />
      <span className="truncate">Open profile</span>
    </Button>
  );
}

// The card for the last sheet, which is nobody's yet: a way in for whoever
// is looking, or back to their own diary once they are in.
export function PrintDock({ shown }: { shown: boolean }): null {
  const auth = useAuth();
  const signedIn = auth.isReady && auth.isAuthenticated;
  const action = useMemo(() => <StartDiary signedIn={signedIn} />, [signedIn]);

  const config = useMemo(
    () =>
      shown
        ? {
            action,
            description: signedIn
              ? "Your films, ratings and lists"
              : "Log films, rate them, keep lists",
            icon: "solar:gallery-add-bold",
            path: "/",
            title: "The next print is yours",
          }
        : null,
    [action, shown, signedIn],
  );

  useDockRegistration(config);
  return null;
}

function StartDiary({ signedIn }: { signedIn: boolean }): JSX.Element {
  const actionClass = useDockActionClass();
  const { navigate, openSurface } = useDockActions();
  const start = useCallback(() => {
    if (signedIn) void navigate("/account");
    else void openSurface(createSignInSurfaceEntry({ next: "/account" }));
  }, [navigate, openSurface, signedIn]);

  return (
    <Button
      className={actionClass({ className: "w-full" })}
      onClick={start}
      type="button"
    >
      <Icon icon="solar:notebook-bold" size={16} />
      <span className="truncate">
        {signedIn ? "Open your diary" : "Start your diary"}
      </span>
    </Button>
  );
}
