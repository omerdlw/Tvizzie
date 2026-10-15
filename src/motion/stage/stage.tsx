"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionStyle,
} from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useOptionalDockActions } from "@omerdlw/base-framework/modules/dock";
import { cn } from "@omerdlw/base-framework/utils";
import {
  dropCarry,
  liftCarry,
  settleCarry,
  useTintedFavicon,
} from "@/motion/film";
import {
  depart,
  endHandoff,
  handoffTo,
  holdSteps,
  samePage,
  stepTo,
  watchIntent,
} from "@/motion/handoff";
import { useScrollY, useSmoothScroll } from "@/motion/scroll";
import { GRAMMAR, type Opening } from "./grammar";
import { EASE, FOCUSED, blur, focus } from "./tempo";
import {
  ExitContext,
  OpeningContext,
  PaceContext,
  TimelineContext,
  useExit,
} from "./clock";
import { Frame, GradeContext } from "./frame";
import { RoomContext } from "./room";
import { createTimeline } from "./timeline";

const LeavingContext = createContext(false);

export const useLeaving = () => useContext(LeavingContext);

const REVEAL_PATIENCE = 2500;

const SEEN = "tvizzie:seen";
const SEEN_KEEP = 60;

function seenList(): string[] {
  try {
    const list: unknown = JSON.parse(sessionStorage.getItem(SEEN) ?? "[]");
    return Array.isArray(list)
      ? list.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function remember(pathname: string) {
  try {
    const list = seenList().filter((item) => item !== pathname);
    list.push(pathname);
    sessionStorage.setItem(SEEN, JSON.stringify(list.slice(-SEEN_KEEP)));
  } catch {
    // Without storage every visit is a first one.
  }
}

// Whether this document has shown a film page yet. A page loaded or reloaded
// into the window is always opened in full, whatever the session has seen.
let booted = false;

// How fast the opening runs. It always runs whole and in its own order, the
// picture first: at its own pace for a page seen for the first time, a little
// quicker when cut to from another film page, and quicker again for one
// already seen this session.
function usePace(pathname: string) {
  const [pace] = useState(() => {
    const { arrive, revisit } = GRAMMAR.film;
    if (!booted) return 1;
    if (seenList().includes(pathname)) return revisit.pace;
    return handoffTo(pathname) ? arrive.pace : 1;
  });
  useEffect(() => {
    booted = true;
    remember(pathname);
  }, [pathname]);
  return pace;
}

export function Stage({
  children,
  className,
  opening,
  picture = false,
}: {
  children: ReactNode;
  className?: string;
  opening: Opening;
  picture?: boolean;
}) {
  const pathname = usePathname();
  const pace = usePace(pathname);
  const [timeline] = useState(() =>
    createTimeline({
      hold: picture,
      opening: opening.end / pace,
      patience: GRAMMAR.section.patience,
      stride: GRAMMAR.section.stride,
    }),
  );
  const reduced = useReducedMotion();
  // Cut to from another film page, the room keeps that page's light until this
  // one's own is read from its picture.
  const [tone, setTone] = useState<string | null>(
    () => handoffTo(pathname)?.grade ?? null,
  );
  const grade = useMemo(() => ({ set: setTone, tone }), [tone]);
  const [lead, setLead] = useState<string | null>(null);
  const room = useMemo(() => ({ lead, setLead }), [lead]);

  useEffect(() => timeline.serial(!reduced), [reduced, timeline]);

  // The opening is cut to the picture: the backdrop rolls the timeline when the
  // projector has its first frame. Without motion there is nothing to wait for,
  // and a picture that never comes is not waited on past the backdrop's own
  // patience.
  useEffect(() => {
    if (reduced) {
      timeline.roll();
      return;
    }
    const timer = setTimeout(timeline.roll, REVEAL_PATIENCE);
    return () => clearTimeout(timer);
  }, [reduced, timeline]);

  const smooth = useSmoothScroll();
  useEffect(() => {
    endHandoff();
    settleCarry();
    smooth?.resync();
  }, [smooth]);
  // A film page is read slowly: the page takes less from each turn of the
  // wheel and glides on longer after it.
  useEffect(() => smooth?.tune(GRAMMAR.scroll), [smooth]);
  useTintedFavicon(tone);

  return (
    <TimelineContext value={timeline}>
      <OpeningContext value={opening}>
        <PaceContext value={pace}>
          <MotionConfig reducedMotion="user">
            <GradeContext value={grade}>
              <RoomContext value={room}>
                <Leaving className={className} tone={tone}>
                  {children}
                </Leaving>
              </RoomContext>
            </GradeContext>
          </MotionConfig>
        </PaceContext>
      </OpeningContext>
    </TimelineContext>
  );
}

const NEUTRAL = [252, 252, 251];

const channels = (tone: string | null) => {
  const parts = tone?.split(/\s+/).map(Number) ?? [];
  return parts.length === 3 && parts.every(Number.isFinite) ? parts : NEUTRAL;
};

// The grade every accent on the page is lit by. A new tone is not switched to
// but drawn over, so nothing tinted by it ever jumps.
function useGradeLight(tone: string | null) {
  const reduced = useReducedMotion();
  const light = useMotionValue(channels(tone).join(" "));

  useEffect(() => {
    const from = channels(light.get());
    const to = channels(tone);
    if (from.every((value, i) => value === to[i])) return;
    const controls = animate(0, 1, {
      duration: reduced ? 0 : GRAMMAR.film.cut,
      ease: EASE.silk,
      onUpdate: (progress) =>
        light.set(
          from
            .map((value, i) => Math.round(value + (to[i] - value) * progress))
            .join(" "),
        ),
    });
    return () => controls.stop();
  }, [light, reduced, tone]);

  return light;
}

function Leaving({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone: string | null;
}) {
  const dock = useOptionalDockActions();
  const router = useRouter();
  const pathname = usePathname();
  const timeline = useContext(TimelineContext);
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const { wait } = GRAMMAR.exit;
  const out = useMotionValue(-1);
  const grade = useGradeLight(tone);

  useEffect(() => {
    if (!leaving) return;
    out.set(0);
    const controls = animate(out, wait + 1, {
      duration: wait + 1,
      ease: "linear",
    });
    return () => {
      controls.stop();
      out.set(-1);
    };
  }, [leaving, out, wait]);

  useEffect(() => {
    if (leaving) timeline?.pause();
    else timeline?.resume();
  }, [leaving, timeline]);

  useEffect(() => {
    if (!dock || reduced) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const waiting = new Set<() => void>();
    const unregister = dock.registerGuard({
      when: (to: string) =>
        new Promise<boolean>((resolve) => {
          setLeaving(true);
          waiting.add(
            depart(to, router, {
              onReturn: () => {
                dropCarry();
                setLeaving(false);
              },
              patience: wait * 1000 + 2500,
            }),
          );
          liftCarry(to, GRAMMAR.film.carry.run);
          timers.add(setTimeout(() => resolve(false), wait * 1000));
        }),
    });
    return () => {
      unregister();
      timers.forEach(clearTimeout);
      waiting.forEach((stop) => stop());
    };
  }, [dock, reduced, router, wait]);

  useEffect(() => watchIntent(router), [router]);

  // Back and forward leave the way a click does. The history step is held
  // while the page goes, in the same one movement, and handed on at the cut;
  // a step taken meanwhile replaces it.
  useEffect(() => {
    if (reduced) return;
    let held: { state: unknown } | null = null;
    let passing = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pass = () => {
      timer = null;
      if (!held) return;
      const { state } = held;
      held = null;
      passing = true;
      window.dispatchEvent(new PopStateEvent("popstate", { state }));
      passing = false;
    };
    const release = holdSteps((event) => {
      if (passing) return false;
      if (samePage(window.location.pathname, pathname)) {
        // Stepped back onto this page before it was gone: it stays.
        if (timer) {
          clearTimeout(timer);
          timer = null;
          held = null;
          endHandoff();
          setLeaving(false);
        }
        return false;
      }
      held = { state: event.state };
      if (!timer) {
        stepTo(window.location.pathname);
        setLeaving(true);
        timer = setTimeout(pass, wait * 1000);
      }
      return true;
    });
    return () => {
      release();
      if (timer) {
        clearTimeout(timer);
        pass();
      }
    };
  }, [pathname, reduced, wait]);

  return (
    <LeavingContext value={leaving}>
      <ExitContext value={out}>
        <motion.main
          className={cn(
            "overflow-x-clip",
            className,
            leaving && "pointer-events-none",
          )}
          data-cinematic
          style={{ "--grade": grade } as MotionStyle}
        >
          <Frame />
          {children}
        </motion.main>
      </ExitContext>
    </LeavingContext>
  );
}

export function Body({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const left = useExit(GRAMMAR.exit.body);
  const opacity = useTransform(left, (p) => 1 - p);
  const y = useTransform(left, (p) => -36 * p);
  return (
    <motion.div className={className} style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}

export function Backdrop({
  children,
}: {
  children: ReactNode | ((reveal: () => void) => ReactNode);
}) {
  const scrollY = useScrollY();
  const timeline = useContext(TimelineContext);
  const [ready, setReady] = useState(false);
  const reveal = useCallback(() => {
    setReady(true);
    timeline?.roll();
  }, [timeline]);

  useEffect(() => {
    const timer = setTimeout(reveal, REVEAL_PATIENCE);
    return () => clearTimeout(timer);
  }, [reveal]);

  const y = useTransform(scrollY, [0, 900], [0, 240]);
  const dim = useTransform(scrollY, [0, 720], [1, 0.2]);
  const push = useTransform(scrollY, [0, 900], [1, 1 + GRAMMAR.scrub.push]);
  const reduced = useReducedMotion();
  const left = useExit(GRAMMAR.exit.backdrop);
  const opacity = useTransform(left, (p) => 1 - p);
  const scale = useTransform(left, (p) => 1 - 0.1 * p);
  const { backdrop } = GRAMMAR;
  const pace = useContext(PaceContext);
  const filter = useTransform(left, (p) =>
    p <= 0
      ? "none"
      : `${focus((backdrop.blur / 2) * p)} brightness(${1 - (1 - backdrop.brightness) * p})`,
  );
  const hidden = {
    filter: `${blur(backdrop.blur)} brightness(${backdrop.brightness})`,
    opacity: 0,
    scale: backdrop.scaleFrom,
  };
  const shown = {
    filter: `${blur(0)} brightness(1)`,
    opacity: 1,
    scale: 1,
    transitionEnd: FOCUSED,
  };

  return (
    <div className="relative">
      <motion.div
        style={{
          opacity: dim,
          scale: push,
          willChange: reduced ? undefined : "transform, opacity",
          y,
        }}
        suppressHydrationWarning
      >
        <motion.div style={{ filter, opacity, scale }}>
          <motion.div
            animate={ready ? shown : hidden}
            initial={hidden}
            transition={{
              delay: backdrop.at / pace,
              duration: backdrop.run / pace,
              // Out of the black a picture develops slowly; cut to from
              // another page it is there at once, and settles.
              ease: pace > 1 ? EASE.silk : EASE.glide,
            }}
          >
            <div className="relative">
              {typeof children === "function" ? children(reveal) : children}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
