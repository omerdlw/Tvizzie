import type { PointerEvent } from "react";

export function trackSpotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse") return;
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty(
    "--mx",
    `${event.clientX - box.left}px`,
  );
  event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
}
