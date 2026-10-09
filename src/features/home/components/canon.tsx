"use client";

import {
  useEffect,
  useMemo,
  useState,
  type JSX,
  type PointerEvent,
} from "react";
import Link from "next/link";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { cn, report } from "@omerdlw/base-framework/utils";
import { movieHref } from "@/config/routes";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { AdaptiveImage } from "@/ui";
import {
  Cascade,
  CascadeItem,
  Section,
  SectionPart,
  useDockLinkClick,
} from "@/motion";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { CANON, type CanonFilm } from "../lib/canon";
import { CANON_PREVIEW } from "../lib/constants";
import { getCanonProgressAction } from "../server/actions";
import { Heading } from "./heading";
import { peek } from "./pointer-poster";

function Entry({
  film,
  seen,
}: {
  film: CanonFilm;
  seen: boolean | null;
}): JSX.Element {
  const href = movieHref(film.id);
  const onClick = useDockLinkClick(href);
  const show = () =>
    peek.show({ id: film.id, posterPath: film.posterPath, title: film.title });

  return (
    <Link
      className="group/entry flex items-center gap-3 py-2 outline-none"
      href={href}
      onBlur={peek.hide}
      onClick={onClick}
      onFocus={show}
      onPointerEnter={show}
      onPointerLeave={peek.hide}
      prefetch={false}
    >
      <span className="w-9 shrink-0 font-zuume text-xl leading-none font-bold text-white/25 tabular-nums">
        {String(film.rank).padStart(3, "0")}
      </span>
      <span className="hidden h-10 w-7 shrink-0 overflow-hidden rounded-[6px] bg-white/5 [@media(hover:none)]:block">
        <AdaptiveImage
          alt=""
          className="object-cover"
          sizes="28px"
          src={tmdbImageUrl("poster", film.posterPath, "w92")}
          wrapperClassName="absolute inset-0"
        />
      </span>
      <span
        className={cn(
          "cine-fade min-w-0 flex-1 truncate font-zuume text-2xl leading-none font-bold uppercase transition-transform duration-slow ease-out-expo group-hover/entry:translate-x-1.5 group-hover/entry:text-white group-focus-visible/entry:translate-x-1.5 group-focus-visible/entry:text-white",
          seen === false ? "text-white/45" : "text-white/90",
        )}
      >
        {film.title}
      </span>
      <span className="shrink-0 text-xs text-white/35 tabular-nums">
        {film.year}
      </span>
      <span
        aria-label={seen ? "Seen" : undefined}
        className={cn(
          "cine-fade size-1.5 shrink-0 rounded-full",
          seen ? "bg-white" : "bg-transparent",
        )}
      />
    </Link>
  );
}

export function Canon(): JSX.Element {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const [loaded, setLoaded] = useState<{ key: string; seen: number[] } | null>(
    null,
  );
  const [all, setAll] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getCanonProgressAction()
      .then((result) => {
        if (cancelled) return;
        if (result.success) setLoaded({ key: userId, seen: result.seen });
        else report("Canon progress", result.error);
      })
      .catch((error) => report("Canon progress", error));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const seen = useMemo(
    () =>
      userId && loaded && loaded.key === userId ? new Set(loaded.seen) : null,
    [loaded, userId],
  );
  const next = seen ? CANON.find((film) => !seen.has(film.id)) : undefined;
  const shown = all ? CANON : CANON.slice(0, CANON_PREVIEW);

  return (
    <Section className="grid w-full gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <Heading kicker="IMDb's top 100, in its order">The Canon</Heading>

        <SectionPart className="flex flex-col gap-4" order={1.5}>
          {seen ? (
            <>
              <p className="flex items-baseline gap-2 font-zuume leading-none font-bold text-white uppercase">
                <span className="text-7xl tabular-nums">{seen.size}</span>
                <span className="text-2xl text-white/40">
                  of {CANON.length} seen
                </span>
              </p>
              <span className="block h-px w-full bg-white/10">
                <span
                  className="block h-full origin-left bg-white transition-transform duration-slow ease-out-expo"
                  style={{ transform: `scaleX(${seen.size / CANON.length})` }}
                />
              </span>
              {next ? (
                <p className="text-sm text-white/50">
                  Next on the list: <NextLink film={next} />
                </p>
              ) : (
                <p className="text-sm text-white/50">All of them. Well done.</p>
              )}
            </>
          ) : userId ? null : (
            <button
              className="cine-fade w-fit cursor-pointer text-left text-sm text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white hover:decoration-white/50"
              onClick={() =>
                void openSurface(
                  createSignInSurfaceEntry({
                    next: window.location.pathname,
                  }),
                )
              }
              type="button"
            >
              Sign in and it keeps count of how many you have seen.
            </button>
          )}
        </SectionPart>
      </div>

      <div
        onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
          if (event.pointerType === "mouse") {
            peek.warm(shown.map((film) => film.posterPath));
          }
        }}
      >
        <Cascade as="ul" className="sm:columns-2 sm:gap-x-12" stagger={0.03}>
          {shown.map((film, position) =>
            position < CANON_PREVIEW ? (
              <CascadeItem
                as="li"
                className="break-inside-avoid border-b border-white/[0.07]"
                key={film.id}
              >
                <Entry film={film} seen={seen ? seen.has(film.id) : null} />
              </CascadeItem>
            ) : (
              <li
                className="home-rise break-inside-avoid border-b border-white/[0.07]"
                key={film.id}
                style={{
                  animationDelay: `${(position - CANON_PREVIEW) * 18}ms`,
                }}
              >
                <Entry film={film} seen={seen ? seen.has(film.id) : null} />
              </li>
            ),
          )}
          {!all ? (
            <li className="break-inside-avoid pt-5">
              <button
                className="cine-fade cursor-pointer text-sm font-semibold text-white/60 hover:text-white"
                onClick={() => setAll(true)}
                type="button"
              >
                Show all {CANON.length}
              </button>
            </li>
          ) : null}
        </Cascade>
      </div>
    </Section>
  );
}

function NextLink({ film }: { film: CanonFilm }): JSX.Element {
  const href = movieHref(film.id);
  const onClick = useDockLinkClick(href);
  return (
    <Link
      className="font-semibold text-white underline decoration-white/20 underline-offset-4 hover:decoration-white/60"
      href={href}
      onClick={onClick}
      prefetch={false}
    >
      {film.title}
    </Link>
  );
}
