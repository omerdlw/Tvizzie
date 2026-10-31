export const bezier = (curve: readonly number[]) =>
  `cubic-bezier(${curve.join(",")})`;

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
  animation.onfinish = () => {
    rest();
    animation.cancel();
  };
  return animation;
}
