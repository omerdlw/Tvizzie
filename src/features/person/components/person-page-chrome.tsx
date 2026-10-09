"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { usePage } from "@omerdlw/base-framework/kernel";
import { useAmbientTheme } from "@omerdlw/base-framework/modules/ambient";
import { useArtworkContextMenu, useArtworkPath } from "@/features/artwork";
import { handoffTo, useDeparture } from "@/motion/handoff";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { PersonDetails } from "@/infrastructure/tmdb/types";
import { PERSON_FALLBACK_ICON } from "../lib/constants";
import { countFilms, describePerson, getBackdropPath } from "../lib/utils";

export function PersonPageChrome({ person }: { person: PersonDetails }): null {
  const defaultBackdrop = getBackdropPath(person);
  const photoPath = useArtworkPath(
    "person",
    person.id,
    "poster",
    person.profilePath,
  );
  const backdropPath = useArtworkPath(
    "person",
    person.id,
    "backdrop",
    defaultBackdrop,
  );
  const photo = tmdbImageUrl("profile", photoPath, "original");
  const backdrop = tmdbImageUrl("backdrop", backdropPath, "original");

  useArtworkContextMenu({
    defaults: { backdrop: defaultBackdrop, poster: person.profilePath },
    id: person.id,
    kind: "person",
  });

  const pathname = usePathname();
  const departure = useDeparture(pathname);

  usePage({
    title: person.name,
    dock: {
      description: describePerson(person, countFilms(person)) || undefined,
      icon: photo ?? PERSON_FALLBACK_ICON,
      name: `person-${person.id}`,
      targetPath: departure,
    },
  });
  const [inherited] = useState(() => handoffTo(pathname)?.palette ?? undefined);
  useAmbientTheme({ image: backdrop ?? photo, initialPalette: inherited });

  return null;
}
