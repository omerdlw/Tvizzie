import type { DockMotion } from "@omerdlw/base-framework/modules/dock";
import { gpuTransform } from "@omerdlw/base-framework/tokens";
import { motion, tween } from "./tokens";

const { durations: time, easings: ease, springs } = motion;

// Light only: what the dock shows comes up and goes down where it stands.
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

// A surface opening is one movement. The action the hand touched goes first,
// the header a beat after it; the card starts to open as the action is gone
// and grows once, straight to the surface's size, while the house lights go
// down. The surface comes into light while the card is still settling, and
// its controls come up over it where they will stay.
//
// Closing runs the other way: the surface and its controls go dark, the card
// closes straight to its resting size, header and action already back on it,
// and they come up as it settles. The card never dips below either size.
const SURFACE = {
  // What leaves before the card moves: the action as it opens, the surface
  // as it closes. Each keeps going dark while the card is already moving.
  hold: time.touch,
  // The surface going dark.
  dark: time.leave,
  // The card opening and closing.
  run: time.move,
  // The surface, its header and its controls wait this long into the move.
  lag: time.touch,
};

// An open surface changing height takes longer the further it moves, within
// the dock's tempo.
const resizeFor = (distancePx: number) => {
  const run = time.reveal * Math.sqrt(Math.max(distancePx, 0) / 240);
  return tween(Math.min(time.move, Math.max(time.light, run)), ease.pour);
};

// Controls sit above the card at their own resting y; they light in place
// there and never ride in.
const atRest = (y: unknown) => gpuTransform(Number(y) || 0);

// A slot in the controls row opens its width on the card's curve and lights
// once there is room for it.
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
    // The surface lighting as the card opens; the header and action lighting
    // as it closes.
    surfaceEnter: tween(time.reveal, ease.fade, SURFACE.lag),
    surfaceStep: tween(time.reveal, ease.fade),
    surfaceExit: tween(SURFACE.dark, ease.fade),
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
    // Titles: the old one goes down as the new one comes up in its place.
    fade: lightSet(tween(time.light, ease.fade, time.step)),
    // The action, arriving and leaving with its page.
    textCrossfade: lightSet(tween(time.reveal, ease.fade)),
    description: (opacity = 0.7) => ({
      hidden: DARK,
      visible: {
        opacity,
        transition: tween(time.light, ease.fade, time.step),
      },
      exit: { ...DARK, transition: leave },
    }),
    // The header row of one card swapping, and the surface replacing it.
    headerSwap: {
      hidden: DARK,
      visible: LIT,
      exit: { ...DARK, transition: leave },
    },
    // The page's header and action on the card: going down as a surface
    // opens (on `anticipation`), coming back up as it closes (on
    // `surfaceEnter`) and as the card returns to the front of the deck.
    headerRestore: lightSet(tween(time.reveal, ease.fade)),
    // The pills on the card behind a surface. The card's content is coming
    // into light as they arrive, so they light quickly inside it.
    extensionShelf: lightSet(tween(time.leave, ease.fade)),
    // The touched action goes before the header around it.
    actionDismiss: {
      hidden: DARK,
      visible: LIT,
      exit: { ...DARK, transition: touchLeave },
    },
    // The toolbar's commands light in reading order, a step apart.
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
    // A count is a dot: it grows where it sits, its light ahead of it.
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
    // House lights: the page goes down as a surface opens, slowly, and comes
    // back up as it closes.
    backdrop: {
      hidden: DARK,
      visible: { ...LIT, transition: tween(time.move, ease.fade) },
      exit: { ...DARK, transition: tween(time.reveal, ease.fade) },
    },
    // Timed by surfaceEnter, surfaceStep and surfaceExit.
    surfaceBody: { hidden: DARK, visible: LIT, exit: DARK },
    controlsContainer: {
      hidden: (y: unknown = 0) => ({ opacity: 0, transform: atRest(y) }),
      visible: (y: unknown = 0) => ({
        opacity: 1,
        transform: atRest(y),
        transition: {
          opacity: tween(time.light, ease.fade, SURFACE.lag),
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
      tap: { scale: 0.97 },
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
    // The card does not gather itself before it moves.
    compress: { open: 1, close: 1 },
    // Cards further back lift a little further and grow a little less.
    peek: (position) => {
      const progress = Math.min(position / 3, 1);
      return {
        lift: position * (4 * (0.85 + progress * 0.35)),
        scale: 1 + 0.008 * (1 - progress * 0.25),
      };
    },
    // A card taken off the deck goes dark where it is.
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
  // The theme's skeleton blocks carry their own shimmer.
  skeleton: "",
  timings: {
    dismissAction: SURFACE.hold,
    anticipation: SURFACE.hold,
    expandBody: SURFACE.run,
    collapseBody: SURFACE.run,
    // Header and action are back on the card while it closes.
    restoreHeader: 0,
    expandStagger: time.step,
    expandStaggerCap: time.leave,
    peekStagger: time.step / 2,
    peekStaggerCap: time.touch,
  },
};
