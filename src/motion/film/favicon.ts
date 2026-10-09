"use client";

import { useEffect } from "react";

const MARK =
  "M22 16h13c6.6 0 11 3.6 11 9 0 3.4-1.8 6-4.8 7.3 3.9 1.2 6.3 4.2 6.3 8.2 0 6-4.8 9.5-12 9.5H22V16zm8 6.5v7.8h4.4c2.8 0 4.4-1.4 4.4-3.9s-1.6-3.9-4.4-3.9H30zm0 13.6v8.4h5.2c3 0 4.8-1.5 4.8-4.2s-1.8-4.2-4.8-4.2H30z";

const iconFor = (tone: string) => {
  const [r, g, b] = tone.split(/\s+/).map(Number);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0a0a0a"/><rect width="64" height="64" rx="16" fill="rgb(${r},${g},${b})" fill-opacity="0.18"/><path d="${MARK}" fill="rgb(${r},${g},${b})"/></svg>`;
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
