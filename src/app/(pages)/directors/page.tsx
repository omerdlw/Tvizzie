import type { JSX } from "react";
import type { Metadata } from "next";
import { DirectorsView, getDirectors } from "@/features/spotlights";
import { shareMetadata } from "@/config/project";

export const metadata: Metadata = shareMetadata({
  description:
    "Twenty great directors, each portrait drawn in the colours of every film they made.",
  image: null,
  title: "Directors",
});

export default async function DirectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ director?: string }>;
}): Promise<JSX.Element> {
  const [directors, { director }] = await Promise.all([
    getDirectors(),
    searchParams,
  ]);
  if (directors.length === 0) throw new Error("Directors are unavailable");
  const asked = directors.findIndex((entry) => String(entry.id) === director);
  return <DirectorsView directors={directors} initial={Math.max(0, asked)} />;
}
