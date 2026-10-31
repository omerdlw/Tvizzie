import type { JSX } from "react";
import type { Metadata } from "next";
import { OscarsView, getLaureates } from "@/features/spotlights";
import { shareMetadata } from "@/config/project";

export const metadata: Metadata = shareMetadata({
  description:
    "Every Best Picture winner of the Academy Awards, cast in gold, from Wings to today.",
  image: null,
  title: "Best Picture",
});

export default async function OscarsPage({
  searchParams,
}: {
  searchParams: Promise<{ ceremony?: string }>;
}): Promise<JSX.Element> {
  const [laureates, { ceremony }] = await Promise.all([
    getLaureates(),
    searchParams,
  ]);
  if (laureates.length === 0) throw new Error("Best Picture is unavailable");
  const asked = laureates.findIndex(
    (film) => String(film.ceremony) === ceremony,
  );
  return (
    <OscarsView
      initial={asked === -1 ? laureates.length - 1 : asked}
      laureates={laureates}
    />
  );
}
