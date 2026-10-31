import type { DockMotion } from "@omerdlw/base-framework/modules/dock";
import { gpuTransform } from "@omerdlw/base-framework/tokens";
import { motion, tween } from "./tokens";

const { durations: time, easings: ease, springs } = motion;

const DARK = { opacity: 0 } as const;
const LIT = { opacity: 1 } as const;

const leave = tween(time.leave, ease.fade);
const touchLeave = tween(time.touch, ease.fade);
const move = tween(time.move, ease.pour);

const lightSet = (
  enter: ReturnType<typeof tween>,
  exit: ReturnType<typeof tween> = leave,
) => ({
  hidden: DARK,
  visible: { ...LIT, transition: enter },
  exit: { ...DARK, transition: exit },
});

const resizeFor = (distancePx: number) => {
  const run = time.reveal * Math.sqrt(Math.max(distancePx, 0) / 240);
  return tween(Math.min(time.move, Math.max(time.light, run)), ease.pour);
};

const atRest = (y: unknown) => gpuTransform(Number(y) || 0);

const controlSlot = {
  hidden: { opacity: 0, width: 0, marginRight: -2 },
  visible: {
    opacity: 1,
    width: "auto",
    marginRight: 0,
    transition: {
      width: tween(time.reveal, ease.pour),
      marginRight: tween(time.reveal, ease.pour),
      opacity: tween(time.light, ease.fade, time.touch),
    },
  },
  exit: {
    opacity: 0,
    width: 0,
    marginRight: -2,
    transition: {
      opacity: touchLeave,
      width: tween(time.light, ease.glide, time.touch),
      marginRight: tween(time.light, ease.glide, time.touch),
    },
  },
};

export const dockMotion: DockMotion = {
  transitions: {
    stack: move,
    expand: move,
    surfaceResize: (distancePx) => {
      const resize = resizeFor(distancePx);
      return { ...resize, height: resize, width: resize };
    },
    surfaceArrival: move,
    anticipation: leave,
    surfaceEnter: tween(time.reveal, ease.fade, time.touch),
    surfaceStep: tween(time.reveal, ease.fade),
    surfaceExit: tween(time.leave, ease.fade),
    card: move,
    cardExpanded: move,
    cardPeek: tween(time.light, ease.pour),
    fade: tween(time.reveal, ease.fade),
    text: tween(time.light, ease.fade),
    headerSwap: tween(time.light, ease.fade, time.step),
    actionDismiss: touchLeave,
    icon: tween(time.light, ease.fade),
    badge: tween(time.light, ease.pour),
    hud: tween(time.reveal, ease.fade),
    press: springs.press,
    scrubberTooltip: tween(time.leave, ease.fade),
    scrubberFollow: springs.follow,
    mediaVolume: tween(time.touch, ease.pour),
  },
  variants: {
    fade: lightSet(tween(time.light, ease.fade, time.step)),
    textCrossfade: lightSet(tween(time.reveal, ease.fade)),
    description: (opacity = 0.7) => ({
      hidden: DARK,
      visible: {
        opacity,
        transition: tween(time.light, ease.fade, time.step),
      },
      exit: { ...DARK, transition: leave },
    }),
    headerSwap: {
      hidden: DARK,
      visible: LIT,
      exit: { ...DARK, transition: leave },
    },
    headerRestore: lightSet(tween(time.reveal, ease.fade)),
    extensionShelf: lightSet(tween(time.leave, ease.fade)),
    actionDismiss: {
      hidden: DARK,
      visible: LIT,
      exit: { ...DARK, transition: touchLeave },
    },
    commandBar: {
      hidden: DARK,
      visible: (index: unknown = 0) => ({
        ...LIT,
        transition: tween(
          time.light,
          ease.fade,
          Math.min(Number(index) || 0, 4) * time.step,
        ),
      }),
      exit: { ...DARK, transition: touchLeave },
    },
    icon: lightSet(tween(time.light, ease.fade)),
    badge: {
      hidden: { opacity: 0, transform: gpuTransform(0, 0.6) },
      visible: {
        opacity: 1,
        transform: gpuTransform(0, 1),
        transition: {
          transform: tween(time.light, ease.pour),
          opacity: tween(time.leave, ease.fade),
        },
      },
      exit: { opacity: 0, transform: gpuTransform(0, 0.8), transition: leave },
    },
    hud: lightSet(tween(time.reveal, ease.fade)),
    scrubberTooltip: lightSet(tween(time.leave, ease.fade), touchLeave),
    breadcrumbs: lightSet(tween(time.reveal, ease.fade, time.leave)),
    backdrop: {
      hidden: DARK,
      visible: { ...LIT, transition: tween(time.move, ease.fade) },
      exit: { ...DARK, transition: tween(time.reveal, ease.fade) },
    },
    surfaceBody: { hidden: DARK, visible: LIT, exit: DARK },
    controlsContainer: {
      hidden: (y: unknown = 0) => ({ opacity: 0, transform: atRest(y) }),
      visible: (y: unknown = 0) => ({
        opacity: 1,
        transform: atRest(y),
        transition: {
          opacity: tween(time.light, ease.fade, time.touch),
          transform: move,
        },
      }),
      exit: (y: unknown = 0) => ({
        opacity: 0,
        transform: atRest(y),
        transition: { opacity: touchLeave, transform: move },
      }),
    },
    controlsAction: controlSlot,
    controlsBack: controlSlot,
    controlsClose: lightSet(tween(time.light, ease.fade), touchLeave),
    press: {
      idle: { scale: 1 },
      hover: { scale: 1 },
      tap: { scale: 1 },
    },
    mediaVolumeThumb: { idle: { scale: 1 }, dragging: { scale: 1.15 } },
    cardContent: { hidden: DARK, visible: LIT },
  },
  deck: {
    elevation: {
      rest: "0px 12px 32px 0px rgba(0,0,0,0.35), 0px 2px 8px 0px rgba(0,0,0,0.25)",
      elevated:
        "0px 32px 80px 0px rgba(0,0,0,0.55), 0px 8px 24px 0px rgba(0,0,0,0.35)",
    },
    compress: { open: 1, close: 1 },
    peek: (position) => {
      const progress = Math.min(position / 3, 1);
      return {
        lift: position * (4 * (0.85 + progress * 0.35)),
        scale: 1 + 0.008 * (1 - progress * 0.25),
      };
    },
    exit: ({ y, scale }) => ({
      opacity: 0,
      transform: gpuTransform(y, scale ?? 1),
      transition: tween(time.reveal, ease.fade),
    }),
    tapScale: 0.98,
  },
  drag: {
    elastic: { top: 0.05, bottom: 0.5 },
    range: [0, 180],
    opacity: [1, 0.75],
    scale: [1, 0.96],
  },
  skeleton: "",
  timings: {
    dismissAction: time.touch,
    anticipation: time.touch,
    expandBody: time.move,
    collapseBody: time.move,
    restoreHeader: 0,
    expandStagger: time.step,
    expandStaggerCap: time.leave,
    peekStagger: time.step / 2,
    peekStaggerCap: time.touch,
  },
};
