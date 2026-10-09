"use client";

import {
  createContext,
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
  settleCarry,
  useTintedFavicon,
} from "@/motion/film";
import { depart, endHandoff, handoffTo, watchIntent } from "@/motion/handoff";
import { useScrollY, useSmoothScroll } from "@/motion/scroll";
import { SCENE } from "../lib/motion";
import { EASE, FOCUSED, blur, focus } from "../lib/tempo";
import { ExitContext, HeadContext, skipped, useExit } from "./clock";
import { Frame, GradeContext } from "./frame";
import { createTimeline, type Timeline } from "./timeline";

export const TimelineContext = createContext<Timeline | null>(null);

const LeavingContext = createContext(false);

export const useLeaving = () => useContext(LeavingContext);

export function Stage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const [head] = useState(() => (handoffTo(pathname) ? SCENE.film.arrive : 0));
  const [timeline] = useState(() =>
    createTimeline({
      head,
      opening: SCENE.opening.end,
      patience: SCENE.section.patience,
      stride: SCENE.section.stride,
    }),
  );
  const reduced = useReducedMotion();
  const [tone, setTone] = useState<string | null>(null);
  const grade = useMemo(() => ({ set: setTone, tone }), [tone]);

  useEffect(() => timeline.serial(!reduced), [reduced, timeline]);

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
        <MotionConfig reducedMotion="user">
          <GradeContext value={grade}>
            <Leaving className={className} tone={tone}>
              {children}
            </Leaving>
          </GradeContext>
        </MotionConfig>
      </HeadContext>
    </TimelineContext>
  );
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
  const timeline = useContext(TimelineContext);
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const { wait } = SCENE.exit;
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
          liftCarry(to, SCENE.film.carry.run);
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
  const left = useExit(SCENE.exit.body);
  const opacity = useTransform(left, (p) => 1 - p);
  const y = useTransform(left, (p) => -36 * p);
  return (
    <motion.div className={className} style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}

export function Backdrop({ children }: { children: ReactNode }) {
  const scrollY = useScrollY();
  const y = useTransform(scrollY, [0, 900], [0, 240]);
  const dim = useTransform(scrollY, [0, 720], [1, 0.2]);
  const push = useTransform(scrollY, [0, 900], [1, 1 + SCENE.scrub.push]);
  const reduced = useReducedMotion();
  const left = useExit(SCENE.exit.backdrop);
  const opacity = useTransform(left, (p) => 1 - p);
  const scale = useTransform(left, (p) => 1 - 0.1 * p);
  const { backdrop } = SCENE;
  const first = skipped(backdrop.at, backdrop.run, useContext(HeadContext));
  const filter = useTransform(left, (p) =>
    p <= 0
      ? "none"
      : `${focus((backdrop.blur / 2) * p)} brightness(${1 - (1 - backdrop.brightness) * p})`,
  );

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
            animate={{
              filter: `${blur(0)} brightness(1)`,
              opacity: 1,
              scale: 1,
              transitionEnd: FOCUSED,
            }}
            initial={{
              filter: `${blur(backdrop.blur)} brightness(${backdrop.brightness})`,
              opacity: 0,
              scale: backdrop.scaleFrom,
            }}
            transition={{
              ...first,
              ease: EASE.glide,
            }}
          >
            <div className="relative">{children}</div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
