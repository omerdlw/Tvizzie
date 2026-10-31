"use client";

import { useState } from "react";
import { usePage } from "@omerdlw/base-framework/kernel";
import {
  useAmbientTheme,
  type AmbientPalette,
} from "@omerdlw/base-framework/modules/ambient";
import {
  useArrival,
  useDeparture,
  useNavigationPayload,
} from "@omerdlw/base-framework/modules/navigation";
import { useArtworkContextMenu, useArtworkPath } from "@/features/artwork";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { PersonDetails } from "@/infrastructure/tmdb/types";
import { PERSON_FALLBACK_ICON } from "../lib/constants";
import { countFilms } from "../lib/credits";
import { getBackdropPath, personSwatch } from "../lib/images";
import { describePerson } from "../lib/profile";

export function PersonPageChrome({
  palette = null,
  person,
}: {
  palette?: AmbientPalette | null;
  person: PersonDetails;
}): null {
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
  const photo = tmdbImageUrl("profile", photoPath, "w185");
  const swatch = personSwatch(backdropPath, photoPath);

  useArtworkContextMenu({
    defaults: { backdrop: defaultBackdrop, poster: person.profilePath },
    id: person.id,
    kind: "person",
  });

  const departure = useDeparture()?.href;
  const arrival = useArrival();

  usePage({
    title: person.name,
    dock: {
      description: describePerson(person, countFilms(person)) || undefined,
      icon: photo ?? PERSON_FALLBACK_ICON,
      name: `person-${person.id}`,
      targetPath: departure,
    },
  });
  const [inherited] = useState(() => arrival?.payload.palette ?? undefined);
  const { palette: lit } = useAmbientTheme({
    image: swatch,
    initialPalette: palette?.source === swatch ? palette : inherited,
  });
  useNavigationPayload("palette", lit);

  return null;
}
