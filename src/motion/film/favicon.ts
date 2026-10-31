"use client";

import { useEffect } from "react";

const iconFor = (tone: string) => {
  const [r, g, b] = tone.split(/\s+/).map(Number);
  const c = `rgb(${r},${g},${b})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="s" x1="8" x2="56" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".5" stop-color="#fffaf0"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient><radialGradient id="h" cx="32" cy="27" r="28" gradientTransform="matrix(1 0 0 .36 0 17.3)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c}" stop-opacity=".6"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><rect width="64" height="64" rx="16" fill="#0a0a0a"/><rect width="64" height="64" rx="16" fill="${c}" fill-opacity="0.18"/><rect y="15" width="64" height="24" fill="url(#h)"/><rect x="12" y="16" width="40" height="7" rx="2" fill="${c}"/><rect x="8" y="25.5" width="48" height="3" fill="url(#s)"/><rect x="15" y="31" width="34" height="18" rx="2" fill="${c}"/></svg>`;
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
