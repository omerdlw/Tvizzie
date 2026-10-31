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
import { usePathname } from "next/navigation";
import {
  NAVIGATION_SOURCE,
  useArrival,
  useNavigationHold,
  useNavigationPayload,
  type NavigationTrip,
} from "@omerdlw/base-framework/modules/navigation";
import { cn } from "@omerdlw/base-framework/utils";
import {
  dropCarry,
  liftCarry,
  settleCarry,
  useTintedFavicon,
} from "@/motion/film";
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
import { Hung, WallContext, pageDown, useWall, useWallScene } from "./wall";

const LeavingContext = createContext(false);

export const useLeaving = () => useContext(LeavingContext);

const REVEAL_PATIENCE = 2500;

const SEEN = "guffin:seen";
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
  } catch {}
}

let booted = false;

function usePace(pathname: string, arrival: NavigationTrip | null) {
  const [pace] = useState(() => {
    const { arrive, revisit } = GRAMMAR.film;
    if (!booted) return 1;
    if (seenList().includes(pathname)) return revisit.pace;
    return arrival ? arrive.pace : 1;
  });
  useEffect(() => {
    booted = true;
    remember(pathname);
  }, [pathname]);
  return pace;
}

export function Stage({
  black = false,
  children,
  className,
  opening,
  picture = false,
  wall,
  wash = true,
}: {
  /**
   * A pure #000 room: the frame adds no light of its own (no wash, grain,
   * glass sheen), so only the page's own effects light it.
   */
  black?: boolean;
  children: ReactNode;
  className?: string;
  opening: Opening;
  picture?: boolean;
  wall?: ReactNode;
  wash?: boolean;
}) {
  const pathname = usePathname();
  const arrival = useArrival();
  const pace = usePace(pathname, arrival);
  const [timeline] = useState(() =>
    createTimeline({
      hold: picture,
      opening: opening.end / pace,
      patience: GRAMMAR.section.patience,
      stride: GRAMMAR.section.stride,
    }),
  );
  const reduced = useReducedMotion();
  const [tone, setTone] = useState<string | null>(
    () => arrival?.payload.grade ?? null,
  );
  const grade = useMemo(() => ({ set: setTone, tone }), [tone]);
  const [lead, setLead] = useState<string | null>(null);
  const room = useMemo(() => ({ lead, setLead }), [lead]);
  const scene = useWallScene();

  useEffect(() => timeline.serial(!reduced), [reduced, timeline]);

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
    settleCarry();
    smooth?.resync();
  }, [smooth]);
  useEffect(() => smooth?.tune(GRAMMAR.scroll), [smooth]);
  useTintedFavicon(tone);

  return (
    <TimelineContext value={timeline}>
      <OpeningContext value={opening}>
        <PaceContext value={pace}>
          <MotionConfig reducedMotion="user">
            <GradeContext value={grade}>
              <RoomContext value={room}>
                <WallContext value={scene}>
                  <Leaving
                    black={black}
                    className={className}
                    tone={tone}
                    wash={wash && !black}
                  >
                    {children}
                    {wall ? <Hung onDown={scene.hung}>{wall}</Hung> : null}
                  </Leaving>
                </WallContext>
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
  black,
  children,
  className,
  tone,
  wash,
}: {
  black: boolean;
  children: ReactNode;
  className?: string;
  tone: string | null;
  wash: boolean;
}) {
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

  // Every trip out of the page, by the dock or the back button, waits for
  // the exit; the carry rides along only on the way forward.
  useNavigationHold(
    reduced
      ? null
      : (trip) => {
          const carried = trip.source !== NAVIGATION_SOURCE.HISTORY;
          setLeaving(true);
          if (carried) liftCarry(trip.href, GRAMMAR.film.carry.run);
          trip.signal.addEventListener(
            "abort",
            () => {
              if (carried) dropCarry();
              setLeaving(false);
            },
            { once: true },
          );
          return new Promise((resolve) => setTimeout(resolve, wait * 1000));
        },
  );
  useNavigationPayload("grade", () => grade.get());

  return (
    <LeavingContext value={leaving}>
      <ExitContext value={out}>
        <motion.main
          className={cn(
            "ui-scene overflow-x-clip",
            className,
            leaving && "pointer-events-none",
          )}
          data-cinematic
          style={{ "--grade": grade } as MotionStyle}
        >
          <Frame black={black} wash={wash} />
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
  const wall = useWall();
  const up = useMotionValue(1);
  const lit = wall?.page ?? up;
  const opacity = useTransform([left, lit], ([p, l]: number[]) => (1 - p) * l);
  const y = useTransform(left, (p) => -36 * p);
  return (
    <motion.div
      className={className}
      hidden={pageDown(wall?.phase)}
      style={{ opacity, y }}
    >
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
  const wall = useWall();
  const up = useMotionValue(1);
  const lit = wall?.page ?? up;
  const opacity = useTransform([left, lit], ([p, l]: number[]) => (1 - p) * l);
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
    <div className="relative" hidden={pageDown(wall?.phase)}>
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
