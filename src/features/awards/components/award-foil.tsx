"use client";

import { use } from "react";
import { Foil } from "@/motion/film";
import type { PictureLight } from "@/motion/stage";
import type { Awards } from "@/infrastructure/tmdb/types";
import { wonAcademyAward } from "../lib/utils";

export function AwardFoil({
  awards,
  ...light
}: PictureLight & { awards: Promise<Awards | null> }) {
  const known = use(awards);
  return known && wonAcademyAward(known) ? <Foil {...light} /> : null;
}
