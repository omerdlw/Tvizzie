import type { Metadata } from "next";

export const project = Object.freeze({
  name: "Guffin",
  description: "Discover movies, cast and crew.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://guffin.film").replace(
    /\/+$/,
    "",
  ),
});

const DESCRIPTION_LIMIT = 200;

export function shareMetadata({
  card = "summary_large_image",
  description,
  image,
  title,
  type,
}: {
  card?: "summary" | "summary_large_image";
  description: string;
  image: string | null;
  title: string;
  type?: "profile" | "video.movie";
}): Metadata {
  const text =
    description.length <= DESCRIPTION_LIMIT
      ? description
      : `${description.slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…`;
  return {
    description: text,
    openGraph: {
      description: text,
      images: image ? [{ url: image }] : [],
      title,
      ...(type && { type }),
    },
    title,
    twitter: {
      card: image ? card : "summary",
      description: text,
      images: image ? [image] : [],
      title,
    },
  };
}
