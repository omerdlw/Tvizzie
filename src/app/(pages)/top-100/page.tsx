import type { JSX } from "react";
import type { Metadata } from "next";
import { WallView, getCanon } from "@/features/spotlights";
import { shareMetadata } from "@/config/project";

export const metadata: Metadata = shareMetadata({
  description:
    "The IMDb Top 100, hung on one wall in the dark.",
  image: null,
  title: "IMDb Top 100",
});

export default async function CanonPage(): Promise<JSX.Element> {
  const films = await getCanon();
  if (films.length === 0) throw new Error("The IMDb Top 100 is unavailable");
  return <WallView films={films} />;
}
