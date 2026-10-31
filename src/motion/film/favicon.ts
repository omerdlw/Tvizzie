"use client";

import { useEffect } from "react";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/ui/logo";

const iconFor = (tone: string) => {
  const [r, g, b] = tone.split(/\s+/).map(Number);
  const c = `rgb(${r},${g},${b})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0a0a0a"/><rect width="64" height="64" rx="16" fill="${c}" fill-opacity="0.18"/><svg x="14" y="14" width="36" height="36" viewBox="${LOGO_VIEWBOX}"><path fill="${c}" d="${LOGO_PATH}"/></svg></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export function useTintedFavicon(tone: string | null) {
  useEffect(() => {
    if (!tone) return;
    const links = [
      ...document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"),
    ];
    if (links.length === 0) return;
    const before = links.map((link) => [link, link.href, link.type] as const);
    const href = iconFor(tone);
    for (const link of links) {
      link.type = "image/svg+xml";
      link.href = href;
    }
    return () => {
      for (const [link, original, type] of before) {
        link.href = original;
        link.type = type;
      }
    };
  }, [tone]);
}
