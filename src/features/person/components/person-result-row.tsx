"use client";

import { useArtworkPath } from "@/features/artwork";
import { Highlight, MediaCard, ResultRow } from "@/ui";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { personHref } from "@/config/routes";
import { departmentRole } from "../lib/profile";

interface PersonResultRowProps {
  person: {
    department: string | null;
    id: number;
    knownFor?: readonly string[];
    name: string;
    profilePath: string | null;
  };
  onNavigated?: () => void;
  query?: string;
}

const PROFILE_WIDTHS = ["w185"] as const;

export function PersonResultRow({
  onNavigated,
  person,
  query,
}: PersonResultRowProps) {
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const role = departmentRole(person.department) ?? "Person";
  const knownFor = person.knownFor?.join(", ");

  return (
    <ResultRow
      href={personHref(person.id)}
      label={`${person.name}, ${role}`}
      meta={
        <>
          <span className="shrink-0">{role}</span>
          {knownFor ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{knownFor}</span>
            </>
          ) : null}
        </>
      }
      onNavigated={onNavigated}
      thumb={
        <MediaCard
          fallbackIcon="solar:user-bold"
          fallbackIconSize={16}
          image={{
            sizes: "32px",
            src: tmdbImageUrl("profile", photoPath, "w185"),
            srcSet:
              tmdbImageSrcSet("profile", photoPath, PROFILE_WIDTHS) ??
              undefined,
          }}
          radius={8}
        />
      }
      title={<Highlight query={query} text={person.name} />}
    />
  );
}
