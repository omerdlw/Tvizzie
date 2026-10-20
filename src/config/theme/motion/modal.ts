import type {
  ModalMotion,
  ModalPositionMotion,
} from "@omerdlw/base-framework/modules/modal";
import { motion, tween } from "./tokens";

const { durations: time, easings: ease } = motion;

const REST = "translate3d(0px, 0px, 0) scale(1)";

const leave = tween(time.leave, ease.fade);

// A sheet is pushed in from its edge on the card's curve and drawn back out
// along it, a little quicker.
const sheet = (offset: string): ModalPositionMotion => ({
  variants: {
    hidden: { opacity: 0, transform: offset },
    visible: {
      opacity: 1,
      transform: REST,
      transition: {
        transform: tween(time.move, ease.pour),
        opacity: tween(time.light, ease.fade),
      },
    },
    exit: {
      opacity: 0,
      transform: offset,
      transition: {
        transform: tween(time.reveal, ease.glide),
        opacity: tween(time.reveal, ease.fade, time.leave),
      },
    },
  },
});

// The dialog brings the light; what is inside it is already there. Rows and
// body hold still so nothing in it fades twice.
const still = { hidden: { opacity: 1 }, visible: { opacity: 1 } };

export const modalMotion: ModalMotion = {
  // House lights: the page goes down slowly behind a dialog and comes back
  // up as it goes.
  backdrop: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: tween(time.move, ease.fade) },
    exit: { opacity: 0, transition: tween(time.reveal, ease.fade) },
  },
  content: still,
  header: still,
  footer: still,
  positions: {
    // A dialog comes up where it stands, settling the last hair of its size
    // as it lights, and goes dark where it is.
    center: {
      variants: {
        hidden: {
          opacity: 0,
          transform: "translate3d(0px, 0px, 0) scale(0.985)",
        },
        visible: {
          opacity: 1,
          transform: REST,
          transition: {
            transform: tween(time.move, ease.pour),
            opacity: tween(time.reveal, ease.fade),
          },
        },
        exit: { opacity: 0, transform: REST, transition: leave },
      },
      transition: tween(time.move, ease.pour),
    },
    top: sheet("translate3d(0px, -100%, 0) scale(1)"),
    right: sheet("translate3d(100%, 0px, 0) scale(1)"),
    bottom: sheet("translate3d(0px, 100%, 0) scale(1)"),
    left: sheet("translate3d(-100%, 0px, 0) scale(1)"),
  },
};
