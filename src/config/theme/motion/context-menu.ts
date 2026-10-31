import type { ContextMenuMotion } from "@omerdlw/base-framework/modules/context-menu";
import { motion, tween } from "./tokens";

const { durations: time, easings: ease, springs } = motion;

const leave = tween(time.touch, ease.fade);
const ORIGIN = "top left";

const rowDelay = (index: unknown) =>
  time.step + Math.min(Math.max(Number(index) || 0, 0), 5) * time.step;

export const contextMenuMotion: ContextMenuMotion = {
  pop: {
    hidden: {
      opacity: 0,
      transform: "translate3d(0px, 0px, 0) scale(0.98)",
      transformOrigin: ORIGIN,
    },
    visible: {
      opacity: 1,
      transform: "translate3d(0px, 0px, 0) scale(1)",
      transformOrigin: ORIGIN,
      transition: {
        transform: tween(time.reveal, ease.pour),
        opacity: tween(time.leave, ease.fade),
      },
    },
    exit: {
      opacity: 0,
      transform: "translate3d(0px, 0px, 0) scale(1)",
      transformOrigin: ORIGIN,
      transition: leave,
    },
  },
  content: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: tween(time.light, ease.fade) },
  },
  item: {
    hidden: { opacity: 0 },
    visible: (index: unknown = 0) => ({
      opacity: 1,
      transition: tween(time.light, ease.fade, rowDelay(index)),
    }),
  },
  itemTap: { transform: "translate3d(0px, 0px, 0) scale(1)" },
  itemTransition: springs.press,
};
