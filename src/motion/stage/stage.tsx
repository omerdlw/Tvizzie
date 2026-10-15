"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useOptionalDockActions } from "@omerdlw/base-framework/modules/dock";
import { cn } from "@omerdlw/base-framework/utils";
import {
  dropCarry,
  liftCarry,
  sceneFor,
  settleCarry,
  useTintedFavicon,
} from "@/motion/film";
import { depart, endHandoff, handoffTo, watchIntent } from "@/motion/handoff";
import { useScrollY, useSmoothScroll } from "@/motion/scroll";
import { GRAMMAR, type Opening } from "./grammar";
import { EASE, FOCUSED, blur, focus } from "./tempo";
import {
  ExitContext,
  HeadContext,
  OpeningContext,
  PaceContext,
  TimelineContext,
  skipped,
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

// Where the opening starts, and how fast it runs: from the top for a film seen
// for the first time, past the black when arriving from another film page, and
// cut quicker still for one already seen this session.
function useHead(pathname: string) {
  const [cut] = useState(() => {
    const { arrive, revisit } = GRAMMAR.film;
    const handed = handoffTo(pathname) ? arrive : 0;
    return seenList().includes(pathname)
      ? { head: Math.max(handed, revisit.head), pace: revisit.pace }
      : { head: handed, pace: 1 };
  });
  useEffect(() => remember(pathname), [pathname]);
  return cut;
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
  const { head, pace } = useHead(pathname);
  const [timeline] = useState(() =>
    createTimeline({
      head,
      hold: picture,
      opening: opening.end / pace,
      patience: GRAMMAR.section.patience,
      stride: GRAMMAR.section.stride,
    }),
  );
  const reduced = useReducedMotion();
  const [tone, setTone] = useState<string | null>(null);
  const grade = useMemo(() => ({ set: setTone, tone }), [tone]);
  const [arrival] = useState(() => handoffTo(pathname)?.scene ?? null);
  const [lead, setLead] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const room = useMemo(
    () => ({ arrival, destination, lead, setLead }),
    [arrival, destination, lead],
  );

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
  useTintedFavicon(tone);

  return (
    <TimelineContext value={timeline}>
      <HeadContext value={head}>
        <OpeningContext value={opening}>
          <PaceContext value={pace}>
            <MotionConfig reducedMotion="user">
              <GradeContext value={grade}>
                <RoomContext value={room}>
                  <Leaving
                    className={className}
                    onDestination={setDestination}
                    tone={tone}
                  >
                    {children}
                  </Leaving>
                </RoomContext>
              </GradeContext>
            </MotionConfig>
          </PaceContext>
        </OpeningContext>
      </HeadContext>
    </TimelineContext>
  );
}

function Leaving({
  children,
  className,
  onDestination,
  tone,
}: {
  children: ReactNode;
  className?: string;
  onDestination: (scene: string | null) => void;
  tone: string | null;
}) {
  const dock = useOptionalDockActions();
  const router = useRouter();
  const timeline = useContext(TimelineContext);
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const { wait } = GRAMMAR.exit;
  const out = useMotionValue(-1);

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
          // The next scene's light comes into the room before the cut: what
          // was clicked to get there is already showing as this page goes.
          const scene = sceneFor(to);
          onDestination(scene);
          setLeaving(true);
          waiting.add(
            depart(to, router, {
              onReturn: () => {
                dropCarry();
                onDestination(null);
                setLeaving(false);
              },
              patience: wait * 1000 + 2500,
              scene,
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
  }, [dock, onDestination, reduced, router, wait]);

  useEffect(() => watchIntent(router), [router]);

  return (
    <LeavingContext value={leaving}>
      <ExitContext value={out}>
        <main
          className={cn(
            "overflow-x-clip",
            className,
            leaving && "pointer-events-none",
          )}
          data-cinematic
          style={{ "--grade": tone ?? "252 252 251" } as CSSProperties}
        >
          <Frame />
          {children}
        </main>
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
  const first = skipped(backdrop.at, backdrop.run, useContext(HeadContext));
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
              ...first,
              ease: EASE.glide,
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
