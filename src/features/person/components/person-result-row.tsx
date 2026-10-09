"use client";

import Link from "next/link";
import { useArtworkPath } from "@/features/artwork";
import { MediaCard } from "@/ui";
import { useDockLinkClick } from "@/motion";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { departmentRole, personHref } from "../lib/utils";

interface PersonResultRowProps {
  person: {
    department: string | null;
    id: number;
    name: string;
    profilePath: string | null;
  };
  onNavigated?: () => void;
}

const PROFILE_WIDTHS = ["w185"] as const;

export function PersonResultRow({ onNavigated, person }: PersonResultRowProps) {
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const role = departmentRole(person.department) ?? "Person";
  const href = personHref(person.id);
  const handleClick = useDockLinkClick(href, onNavigated);

  return (
    <Link
      aria-label={`${person.name}, ${role}`}
      className="cine-fade group/row flex items-center gap-3 rounded-[20px] p-0.5 pr-3 outline-none hover:bg-white/10 focus-visible:bg-white/10"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      <MediaCard
        className="w-14 shrink-0"
        fallbackIcon="solar:user-bold"
        fallbackIconSize={20}
        image={{
          sizes: "56px",
          src: tmdbImageUrl("profile", photoPath, "w185"),
          srcSet:
            tmdbImageSrcSet("profile", photoPath, PROFILE_WIDTHS) ?? undefined,
        }}
        radius={18}
      />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className="w-full truncate text-sm leading-tight font-bold text-white uppercase">
          {person.name}
        </span>
        <span className="rounded-lg px-2 py-1 text-xs font-bold text-white/70 ring-1 ring-white/5 ring-inset">
          {role}
        </span>
      </span>
    </Link>
  );
}
