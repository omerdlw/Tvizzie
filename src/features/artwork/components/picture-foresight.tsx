"use client";

import { useEffect } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { readable } from "@/motion/film";
import { foresee } from "@/motion/handoff";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { artworkKey } from "../lib/entries";
import { artworkStore } from "../lib/store";

const PAGE = /^\/(movie|person)\/([1-9]\d{0,9})$/;
const KEEP = 6;

// Pictures already asked for, newest last: held so the browser keeps them
// decoded until the projector of the page they belong to takes them up.
const held = new Map<string, HTMLImageElement>();

function hold(src: string) {
  if (held.has(src)) return;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = readable(src);
  void image.decode().catch(() => {});
  held.set(src, image);
  while (held.size > KEEP) held.delete(held.keys().next().value as string);
}

async function ready(path: string) {
  const match = PAGE.exec(path);
  if (!match) return;
  const kind = match[1] as "movie" | "person";
  const id = Number(match[2]);
  const chosen = artworkStore.getSnapshot()[artworkKey(kind, id)]?.backdrop;
  if (chosen) {
    const src = tmdbImageUrl("backdrop", chosen, "original");
    if (src) hold(src);
    return;
  }
  const response = await fetch(`/api/picture?kind=${kind}&id=${id}`);
  if (!response.ok) return;
  const { path: picture } = (await response.json()) as { path: unknown };
  const src =
    typeof picture === "string"
      ? tmdbImageUrl("backdrop", picture, "original")
      : null;
  if (src) hold(src);
}

// A film page opens on its picture, and the cut to it waits for the projector
// to have it. Asked for while the pointer is still on the way, the picture is
// usually there before the page is.
export function PictureForesight(): null {
  useEffect(
    () =>
      foresee((path) => {
        ready(path).catch((error) => report("PictureForesight", error));
      }),
    [],
  );
  return null;
}
