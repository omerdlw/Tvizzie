import { PHI } from "../stage/tempo";

export { EASE, blur, settle } from "../stage/tempo";

const BEAT = 1 / (PHI * PHI);
export const beat = (n: number) => +(n * BEAT).toFixed(3);
export const span = (n: number) => +(0.618 * PHI ** n).toFixed(3);

export const sequence = (i: number, n: number, total: number) =>
  n <= 1 ? 0 : (total * i) / (n - 1);

export interface Score {
  backdrop: {
    blur: number;
    brightness: number;
    delay: number;
    fade: number;
    push: number;
    scaleFrom: number;
    scaleTo: number;
  };
  exit: {
    backdrop: { delay: number; duration: number };
    body: { delay: number; duration: number };
    poster: { delay: number; duration: number };
    title: { duration: number; stagger: number };
    wait: number;
  };
  poster: {
    delay: number;
    duration: number;
    shine: number;
    zoom: number;
  };
  scroll: { duration: number; offset: number };
  title: { delay: number; duration: number; span: number; stagger: number };
}
