import { useEffect, type RefObject } from "react";
import { useReducedMotion } from "motion/react";
import { layoutTop } from "@/motion/flow";
import { useSmoothScroll } from "@/motion/scroll";

// Where a section has come in, the wheel's momentum stops: a flick that
// began before it comes to rest there, with the section's way in seen and
// its first thing in place, and it takes another to go on. Without these
// one hard flick on a trackpad crosses half the page.
export function useStop(
  section: RefObject<HTMLElement | null>,
  // Screens from the top of the section, one or several.
  at: number | readonly number[],
): void {
  const engine = useSmoothScroll();
  const reduced = Boolean(useReducedMotion());
  const key = (typeof at === "number" ? [at] : at).join(",");

  useEffect(() => {
    const element = section.current;
    if (!engine || !element || reduced || !key) return;
    const removers = key
      .split(",")
      .map(Number)
      .map((screens) =>
        engine.stopAt(() => layoutTop(element) + screens * window.innerHeight),
      );
    return () => removers.forEach((remove) => remove());
  }, [engine, key, reduced, section]);
}
