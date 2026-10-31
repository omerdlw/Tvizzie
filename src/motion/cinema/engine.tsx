"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useNavigationHold } from "@omerdlw/base-framework/modules/navigation";
import { cn } from "@omerdlw/base-framework/utils";
import { useOpticalInset } from "../optical-inset";
import { useScrollY, useSmoothScroll } from "../scroll";
import { EASE, blur, sequence, settle, type Score } from "./score";

const ScoreContext = createContext<Score | null>(null);

export function useScore(): Score {
  const score = useContext(ScoreContext);
  if (!score) throw new Error("This needs a <Scene> above it");
  return score;
}

interface SceneTime {
  born: number | null;
}

const SceneClock = createContext<SceneTime | null>(null);

function sceneElapsed(clock: SceneTime) {
  clock.born ??= performance.now();
  return (performance.now() - clock.born) / 1000;
}

const LeavingContext = createContext(false);

export const useLeaving = () => useContext(LeavingContext);

const REVEAL_MARGIN = "0px 0px -6% 0px";

export function useReveal<T extends HTMLElement>({
  intro = 0,
}: { intro?: number } = {}) {
  const ref = useRef<T>(null);
  const clock = useContext(SceneClock);
  const [delay, setDelay] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[entries.length - 1]?.isIntersecting) return;
        observer.disconnect();
        const wait = clock === null ? 0 : intro - sceneElapsed(clock);
        setDelay((current) => current ?? Math.max(0, wait));
      },
      { rootMargin: REVEAL_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [clock, intro]);

  return { delay: delay ?? 0, ref, shown: delay !== null };
}

const within = (href: string, scope?: string) => {
  if (!scope) return false;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return path === scope || path.startsWith(`${scope}/`);
};

export function Scene({
  children,
  className,
  scope,
  score,
}: {
  children: ReactNode;
  className?: string;
  scope?: string;
  score: Score;
}) {
  const [clock] = useState<SceneTime>(() => ({ born: null }));
  const smooth = useSmoothScroll();
  useEffect(() => smooth?.resync(), [smooth]);

  return (
    <ScoreContext value={score}>
      <SceneClock value={clock}>
        <MotionConfig reducedMotion="user">
          <Leaving className={className} scope={scope}>
            {children}
          </Leaving>
        </MotionConfig>
      </SceneClock>
    </ScoreContext>
  );
}

function Leaving({
  children,
  className,
  scope,
}: {
  children: ReactNode;
  className?: string;
  scope?: string;
}) {
  const reduced = useReducedMotion();
  const { wait } = useScore().exit;
  const [leaving, setLeaving] = useState(false);

  useNavigationHold(
    reduced
      ? null
      : (trip) => {
          if (within(trip.to, scope)) return;
          setLeaving(true);
          trip.signal.addEventListener("abort", () => setLeaving(false), {
            once: true,
          });
          return new Promise((resolve) => setTimeout(resolve, wait * 1000));
        },
    { history: false },
  );

  return (
    <LeavingContext value={leaving}>
      <main
        className={cn(
          "ui-scene overflow-x-clip",
          className,
          leaving && "pointer-events-none",
        )}
        data-cinematic
      >
        {children}
      </main>
    </LeavingContext>
  );
}

export function SceneBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const leaving = useLeaving();
  const score = useScore();
  const { body } = score.exit;
  return (
    <motion.div
      animate={leaving ? { opacity: 0, y: -36 } : { opacity: 1, y: 0 }}
      className={className}
      transition={
        leaving
          ? { delay: body.delay, duration: body.duration, ease: EASE.glide }
          : { duration: score.scroll.duration, ease: EASE.expo }
      }
    >
      {children}
    </motion.div>
  );
}

export function HeroStage({ children }: { children: ReactNode }) {
  const scrollY = useScrollY();
  const y = useTransform(scrollY, [0, 900], [0, 240]);
  const dim = useTransform(scrollY, [0, 720], [1, 0.2]);
  const leaving = useLeaving();
  const { backdrop, exit } = useScore();

  return (
    <div className="relative">
      <motion.div style={{ opacity: dim, y }} suppressHydrationWarning>
        <motion.div
          animate={
            leaving
              ? {
                  filter: `${blur(backdrop.blur / 2)} brightness(${backdrop.brightness})`,
                  opacity: 0,
                  scale: backdrop.scaleTo * 0.9,
                }
              : {
                  filter: `${blur(0)} brightness(1)`,
                  opacity: 1,
                  scale: backdrop.scaleTo,
                }
          }
          initial={{
            filter: `${blur(backdrop.blur)} brightness(${backdrop.brightness})`,
            opacity: 0,
            scale: backdrop.scaleFrom,
          }}
          transition={
            leaving
              ? {
                  delay: exit.backdrop.delay,
                  duration: exit.backdrop.duration,
                  ease: EASE.glide,
                }
              : {
                  filter: {
                    delay: backdrop.delay,
                    duration: backdrop.fade,
                    ease: EASE.silk,
                  },
                  opacity: {
                    delay: backdrop.delay,
                    duration: backdrop.fade,
                    ease: EASE.silk,
                  },
                  scale: {
                    delay: backdrop.delay,
                    duration: backdrop.push,
                    ease: EASE.expo,
                  },
                }
          }
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}

export function CinemaTitle({
  centered = false,
  children: title,
  className,
  drift: drifts = true,
}: {
  centered?: boolean;
  children: string;
  className?: string;
  drift?: boolean;
}) {
  const words = title.split(/\s+/).filter(Boolean);
  const heading = useRef<HTMLHeadingElement>(null);
  useOpticalInset(heading, title, !centered);
  const leaving = useLeaving();
  const score = useScore();
  const scrollY = useScrollY();
  const drift = useTransform(scrollY, [0, 600], [0, -56]);
  const { delay, duration, span, stagger } = score.title;
  const total = Math.min(stagger * (words.length - 1), span);
  const { exit } = score;
  const outTotal = Math.min(
    exit.title.stagger * (words.length - 1),
    Math.max(0, exit.wait - exit.title.duration - 0.08),
  );

  return (
    <motion.h1
      animate={{
        color: leaving ? "rgb(255 255 255 / 0)" : "rgb(255 255 255 / 1)",
      }}
      aria-label={title}
      className={className}
      initial={{ color: "rgb(255 255 255 / 0)" }}
      ref={heading}
      style={drifts ? { y: drift } : undefined}
      suppressHydrationWarning
      transition={{
        delay: leaving ? 0 : delay + total + duration * 0.5,
        duration: 0.6,
      }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span
            aria-hidden="true"
            className="-mb-[0.12em] inline-block overflow-hidden pr-[0.04em] pb-[0.12em] align-bottom"
          >
            <motion.span
              animate={
                leaving
                  ? { filter: blur(12), opacity: 0, rotate: -3, y: "-118%" }
                  : { filter: blur(0), opacity: 1, rotate: 0, y: "0%" }
              }
              className={cn(
                "inline-block text-white",
                centered ? "origin-bottom" : "origin-bottom-left",
              )}
              initial={{ filter: blur(18), opacity: 0, rotate: 5, y: "118%" }}
              transition={
                leaving
                  ? {
                      delay: sequence(index, words.length, outTotal),
                      duration: exit.title.duration,
                      ease: EASE.glide,
                    }
                  : {
                      delay: delay + settle(index, words.length, total),
                      duration,
                      ease: EASE.expo,
                    }
              }
            >
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </motion.h1>
  );
}

const TAGS = {
  div: motion.div,
  li: motion.li,
  p: motion.p,
  section: motion.section,
} as const;

type Tag = keyof typeof TAGS;

export function Reveal({
  as = "div",
  blurPx = 14,
  children,
  className,
  duration,
  intro = 0,
  offset,
}: {
  as?: Extract<Tag, "div" | "li" | "p" | "section">;
  blurPx?: number;
  children: ReactNode;
  className?: string;
  duration?: number;
  intro?: number;
  offset?: number;
}) {
  const { scroll } = useScore();
  const { delay, ref, shown } = useReveal<HTMLDivElement>({ intro });
  const Component = TAGS[as] as typeof motion.div;
  const soft = blurPx > 0;
  return (
    <Component
      animate={
        shown
          ? { ...(soft && { filter: blur(0) }), opacity: 1, y: 0 }
          : undefined
      }
      className={className}
      initial={{
        ...(soft && { filter: blur(blurPx) }),
        opacity: 0,
        y: offset ?? scroll.offset,
      }}
      ref={ref}
      transition={{
        delay,
        duration: duration ?? scroll.duration,
        ease: EASE.expo,
      }}
    >
      {children}
    </Component>
  );
}

export function RowItem({
  as = "li",
  children,
  className,
  count,
  index,
  intro = 0,
  total,
}: {
  as?: Extract<Tag, "div" | "li">;
  children: ReactNode;
  className?: string;
  count: number;
  index: number;
  intro?: number;
  total: number;
}) {
  const { scroll } = useScore();
  const { delay, ref, shown } = useReveal<HTMLDivElement>({ intro });
  const Component = TAGS[as] as typeof motion.div;
  return (
    <Component
      animate={shown ? { filter: blur(0), opacity: 1, y: 0 } : undefined}
      className={className}
      initial={{ filter: blur(8), opacity: 0, y: 14 }}
      ref={ref}
      transition={{
        delay: delay + sequence(index, count, total),
        duration: scroll.duration * 0.8,
        ease: EASE.expo,
      }}
    >
      {children}
    </Component>
  );
}
