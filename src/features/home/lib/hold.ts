import type { useSmoothScroll } from "@/motion/scroll";

// A section the page is held at: once the scroll reaches it, the page stops
// there and its items are not scrolled through but stepped through, one for
// each turn of the wheel or swipe. Past the first item going back or the
// last going on, the page scrolls as it would. Coming into the section from
// either side, the page stops at it.

type SmoothScroll = NonNullable<ReturnType<typeof useSmoothScroll>>;

// A jump of the scroll this many screens in one frame is a scrollbar thrown
// or a key that goes to the end, and is let through, not caught.
const JUMP = 0.6;
// A turn of the wheel ends once it has been quiet this long, however long
// its momentum ran on before that.
const GESTURE_GAP_MS = 220;
// Of the wheel, and of a swipe, in pixels, before it counts as a step.
const NUDGE = 24;
const SWIPE = 36;

export interface HoldOptions {
  count: number;
  // The least time between two steps.
  cooldown: number;
  // Takes the step to an item.
  go: (to: number) => void;
  index: () => number;
  // The scroll at which the page is held.
  pin: () => number;
  reduced: boolean;
  smoothScroll: SmoothScroll | null;
  // When the last step was taken, on the performance clock.
  steppedAt: () => number;
  // The height of the screen, for wheels that count in pages.
  vh: () => number;
}

export interface Hold {
  // Brings the page to where it is held.
  settle(): void;
  // Each frame: momentum the wheel did not carry, a swipe's or a
  // scrollbar's, is stopped at the section as it passes.
  catchAt(y: number): void;
  dispose(): void;
}

export function holdSteps(options: HoldOptions): Hold {
  const { count, cooldown, go, index, pin, reduced, smoothScroll } = options;
  let lastWheel = 0;
  let gesture = 0;
  let used = false;
  let touchY = 0;
  let touchUsed = false;
  let lastY = window.scrollY;

  const settle = () => {
    const y = pin();
    if (reduced) window.scrollTo({ top: y, behavior: "instant" });
    else if (smoothScroll) smoothScroll.scrollTo(y, { duration: 0.55 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const delta =
      event.deltaMode === 1
        ? event.deltaY * 40
        : event.deltaMode === 2
          ? event.deltaY * options.vh()
          : event.deltaY;
    if (delta === 0) return;
    const now = performance.now();
    if (now - lastWheel > GESTURE_GAP_MS) {
      gesture = 0;
      used = false;
    }
    lastWheel = now;
    const y = window.scrollY;
    const at = pin();
    const heading = smoothScroll ? smoothScroll.destination : y;
    const forward = delta > 0;
    const current = index();
    const free = forward ? current < count - 1 : current > 0;

    if (Math.abs(y - at) <= 2 && Math.abs(heading - at) <= 2) {
      if (!free && !used) return;
      event.preventDefault();
      gesture += delta;
      if (
        !used &&
        free &&
        Math.abs(gesture) > NUDGE &&
        now - options.steppedAt() > cooldown
      ) {
        go(current + (forward ? 1 : -1));
        used = true;
      }
      return;
    }
    const arriving = forward
      ? y < at - 2 && heading + delta >= at - 2
      : y > at + 2 && heading + delta <= at + 2;
    if (!arriving) return;
    event.preventDefault();
    used = true;
    if (Math.abs(heading - at) > 2) settle();
  };

  const touchStart = (event: TouchEvent) => {
    touchY = event.touches[0]?.clientY ?? 0;
    touchUsed = false;
  };
  const touchMove = (event: TouchEvent) => {
    if (Math.abs(window.scrollY - pin()) > 3) return;
    const dy = touchY - (event.touches[0]?.clientY ?? touchY);
    if (dy === 0) return;
    const forward = dy > 0;
    const at = index();
    const free = forward ? at < count - 1 : at > 0;
    if (!free && !touchUsed) return;
    if (event.cancelable) event.preventDefault();
    if (
      !touchUsed &&
      free &&
      Math.abs(dy) > SWIPE &&
      performance.now() - options.steppedAt() > cooldown
    ) {
      go(at + (forward ? 1 : -1));
      touchUsed = true;
    }
  };

  window.addEventListener("wheel", wheel, { capture: true, passive: false });
  window.addEventListener("touchstart", touchStart, { passive: true });
  window.addEventListener("touchmove", touchMove, { passive: false });

  return {
    settle,
    catchAt(y) {
      const hold = pin();
      if (
        performance.now() - lastWheel > 400 &&
        Math.abs(y - lastY) < options.vh() * JUMP &&
        ((lastY < hold - 2 && y > hold + 2) ||
          (lastY > hold + 2 && y < hold - 2))
      ) {
        window.scrollTo({ top: hold, behavior: "instant" });
      }
      lastY = y;
    },
    dispose() {
      window.removeEventListener("wheel", wheel, { capture: true });
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
    },
  };
}
