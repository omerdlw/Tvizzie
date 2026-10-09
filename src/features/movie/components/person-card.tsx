"use client";

import Link from "next/link";
import { personHref } from "@/config/routes";
import { useArtworkPath } from "@/features/artwork";
import { MediaCard } from "@/ui";
import { useDockLinkClick } from "@/motion";
import { trackSpotlight } from "../stage";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { cn } from "@omerdlw/base-framework/utils";
import type { PersonEntry } from "../lib/types";

export function PersonCard({
  compact = false,
  onNavigated,
  person,
}: {
  compact?: boolean;
  onNavigated?: () => void;
  person: PersonEntry;
}) {
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const src = tmdbImageUrl("profile", photoPath, "original");
  const href = personHref(person.id);
  const handleClick = useDockLinkClick(href, onNavigated);

  return (
    <Link
      aria-label={`${person.name}, ${person.subtitle}`}
      href={href}
      onClick={handleClick}
      onPointerMove={trackSpotlight}
      prefetch={false}
      className={cn(
        "cine-card cine-fade cine-spot relative flex items-center gap-3 overflow-hidden outline-none focus-visible:ring-white/50 rounded-[20px] bg-white/5 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:ring-white/10",
        compact
          ? "h-10 min-w-0 flex-1 rounded-[16px] p-1 pr-2"
          : "h-[84px] p-1 pr-4",
      )}
    >
      <MediaCard
        aspect="free"
        className="shrink-0"
        fallbackIcon="solar:user-bold"
        fallbackIconSize={compact ? 14 : 20}
        frameClassName={compact ? "size-8" : "h-[76px] w-14"}
        framed={false}
        image={{ sizes: compact ? "32px" : "56px", src }}
        radius={compact ? 12 : 16}
      />

      {compact ? (
        <span className="truncate text-xs font-semibold text-white">
          {person.name}
        </span>
      ) : (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-white">
            {person.name}
          </span>
          <span className="truncate text-[10px] font-semibold tracking-[0.14em] text-white/50 uppercase">
            {person.subtitle}
          </span>
        </div>
      )}
    </Link>
  );
}
