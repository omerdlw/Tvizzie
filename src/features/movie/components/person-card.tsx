"use client";

import Link from "next/link";
import { personHref } from "@/config/routes";
import { useArtworkPath } from "@/features/artwork";
import { RADIUS } from "@/ui/radius";
import { MediaCard } from "@/ui";
import { useDockLinkClick } from "@/motion";
import { SCENE } from "../lib/motion";
import { Develop, Expose, trackSpotlight } from "../stage";
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
  // A card shows a thumbnail, but the photo it carries to the person's page
  // lands on their portrait, so it is fetched at the portrait's height.
  const src = tmdbImageUrl("profile", photoPath, "h632");
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
        "cine-card cine-fade cine-spot relative flex items-center gap-3 overflow-hidden outline-none focus-visible:ring-white/50 rounded-control bg-white/5 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:ring-white/10",
        compact ? "h-10 min-w-0 flex-1 p-1 pr-2" : "h-[84px] p-1 pr-4",
      )}
    >
      <Develop at={SCENE.card.photo} className="shrink-0" radius={RADIUS.chip}>
        <MediaCard
          aspect="free"
          className="shrink-0"
          fallbackIcon="solar:user-bold"
          fallbackIconSize={compact ? 14 : 20}
          frameClassName={compact ? "size-8" : "h-[76px] w-14"}
          framed={false}
          image={{ sizes: compact ? "32px" : "56px", src }}
          radius={RADIUS.chip}
        />
      </Develop>

      {compact ? (
        <Expose
          as="div"
          className="min-w-0 truncate text-xs font-semibold text-white"
          since={SCENE.card.name}
          truncate
        >
          {person.name}
        </Expose>
      ) : (
        <div className="flex min-w-0 flex-col">
          <Expose
            as="div"
            className="truncate text-sm font-semibold text-white"
            since={SCENE.card.name}
            truncate
          >
            {person.name}
          </Expose>
          <Expose
            as="div"
            className="truncate text-[10px] font-semibold tracking-[0.14em] text-white/50 uppercase"
            since={SCENE.card.role}
            truncate
          >
            {person.subtitle}
          </Expose>
        </div>
      )}
    </Link>
  );
}
