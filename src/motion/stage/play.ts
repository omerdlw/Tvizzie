export const bezier = (curve: readonly number[]) =>
  `cubic-bezier(${curve.join(",")})`;

// Plays a reveal on the compositor, starting `wait` seconds from now (before
// now if it is negative, so it picks up part way). Following a clock frame by
// frame would restyle and repaint the element on the main thread every frame
// it moves, scroll or no scroll; this costs nothing once it is under way.
export function play(
  element: HTMLElement,
  keyframes: PropertyIndexedKeyframes,
  { easing, run, wait }: { easing: string; run: number; wait: number },
  rest: () => void,
) {
  const animation = element.animate(keyframes, {
    delay: wait * 1000,
    duration: run * 1000,
    easing,
    fill: "both",
  });
  // The rest is written down before the animation lets go of the element, in
  // the same task, so no frame ever shows it back where it started.
  animation.onfinish = () => {
    rest();
    animation.cancel();
  };
  return animation;
}
