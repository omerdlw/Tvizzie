"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useOptionalDockActions } from "@omerdlw/base-framework/modules/dock";
import { cn } from "@omerdlw/base-framework/utils";
import { useScrollY } from "../scroll";
import { createConductor, type Conductor, type Gate } from "./conductor";
import {
  EASE,
  blur,
  cascadeGroup,
  cascadeItems,
  landed,
  sequence,
  settle,
  beat,
  type Score,
} from "./score";

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

const ConductorContext = createContext<Conductor | null>(null);

const LeavingContext = createContext(false);

export const useLeaving = () => useContext(LeavingContext);

export function useReveal<T extends HTMLElement>({
  gate = false,
  intro = 0,
  lasts,
  margin = "0px 0px -6% 0px",
  step,
}: {
  gate?: boolean;
  intro?: number;
  lasts?: number;
  margin?: string;
  step?: number;
} = {}) {
  const ref = useRef<T>(null);
  const clock = useContext(SceneClock);
  const conductor = useContext(ConductorContext);
  const section = useContext(SectionContext);
  const [mountedAt] = useState(() => performance.now());
  const [revealed, setRevealed] = useState<SectionReveal | null>(null);
  const follow = step !== undefined && section !== null;
  const queue = useRef<Gate | null>(null);
  const sectionHold = section?.hold;

  useEffect(() => {
    if (follow) return;
    const element = ref.current;
    if (!element) return;
    let done = false;
    const open = (delay: number) => {
      done = true;
      if (!queued) observer.disconnect();
      setRevealed((current) => current ?? { at: performance.now(), delay });
    };
    const wait = () => (clock === null ? 0 : intro - sceneElapsed(clock));
    const queued =
      gate && conductor
        ? conductor.join({
            lead: () => Math.max(0, wait()),
            open,
            order: () => element.getBoundingClientRect().top,
          })
        : null;
    queue.current = queued;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (done) {
          if (!entry.isIntersecting) queued?.dismiss();
          return;
        }
        if (queued) {
          if (entry.isIntersecting) queued.request();
          else queued.withdraw();
          return;
        }
        if (entry.isIntersecting) open(Math.max(0, wait()));
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      queued?.leave();
      queue.current = null;
    };
  }, [clock, conductor, follow, gate, intro, margin]);

  let reveal: SectionReveal | null;
  let delay: number;
  if (follow) {
    reveal = section.reveal;
    delay = !reveal
      ? 0
      : mountedAt >= reveal.at
        ? Math.max(
            0,
            (reveal.at + (reveal.delay + step) * 1000 - mountedAt) / 1000,
          )
        : reveal.delay + step;
  } else {
    reveal = revealed;
    delay = revealed?.delay ?? 0;
  }
  const shown = reveal !== null;

  const hold = useCallback(
    (seconds: number) => {
      const until = performance.now() + seconds * 1000;
      if (follow) sectionHold?.(seconds);
      else queue.current?.extend(until);
    },
    [follow, sectionHold],
  );

  const arrival = useRef({ delay, hold, lasts });
  useEffect(() => {
    arrival.current = { delay, hold, lasts };
  });
  useEffect(() => {
    if (!shown) return;
    const { delay, hold, lasts } = arrival.current;
    if (lasts !== undefined) hold(delay + lasts);
  }, [shown]);

  return { at: reveal?.at ?? 0, delay, hold, ref, shown };
}

interface SectionReveal {
  at: number;
  delay: number;
}

const SectionContext = createContext<{
  hold: (seconds: number) => void;
  lead: number;
  reveal: SectionReveal | null;
} | null>(null);

const useSection = () => useContext(SectionContext);

export function Section({
  children,
  className,
  intro = 0,
  lead: leadOverride,
}: {
  children: ReactNode;
  className?: string;
  intro?: number;
  lead?: number;
}) {
  const lead = leadOverride ?? beat(1.4);
  const { at, delay, hold, ref, shown } = useReveal<HTMLElement>({
    gate: true,
    intro,
  });
  const value = useMemo(
    () => ({ hold, lead, reveal: shown ? { at, delay } : null }),
    [at, delay, hold, lead, shown],
  );
  return (
    <SectionContext value={value}>
      <section className={className} ref={ref}>
        {children}
      </section>
    </SectionContext>
  );
}

export function SectionPart({
  children,
  className,
  order = 0,
}: {
  children: ReactNode;
  className?: string;
  order?: number;
}) {
  const { scroll } = useScore();
  const part = { blur: 8, duration: scroll.duration * 0.8, y: 14 };
  const duration = part.duration;
  const { delay, ref, shown } = useReveal<HTMLDivElement>({
    lasts: landed(duration),
    step: order * beat(1),
  });
  return (
    <motion.div
      animate={shown ? { filter: blur(0), opacity: 1, y: 0 } : undefined}
      className={className}
      initial={{ filter: blur(part.blur), opacity: 0, y: part.y }}
      ref={ref}
      transition={{ delay, duration, ease: EASE.expo }}
    >
      {children}
    </motion.div>
  );
}

export function Scene({
  children,
  className,
  score,
}: {
  children: ReactNode;
  className?: string;
  score: Score;
}) {
  const [clock] = useState<SceneTime>(() => ({ born: null }));
  const [conductor] = useState(() => createConductor());
  const reduced = useReducedMotion();
  useEffect(() => {
    conductor.start();
    return () => conductor.stop();
  }, [conductor]);
  useEffect(() => conductor.setSerial(!reduced), [conductor, reduced]);

  return (
    <ScoreContext value={score}>
      <SceneClock value={clock}>
        <ConductorContext value={conductor}>
          <MotionConfig reducedMotion="user">
            <Leaving className={className}>{children}</Leaving>
          </MotionConfig>
        </ConductorContext>
      </SceneClock>
    </ScoreContext>
  );
}

function Leaving({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const dock = useOptionalDockActions();
  const conductor = useContext(ConductorContext);
  const reduced = useReducedMotion();
  const { wait } = useScore().exit;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!conductor) return;
    if (leaving) conductor.pause();
    else conductor.resume();
  }, [conductor, leaving]);

  useEffect(() => {
    if (!dock || reduced) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const unregister = dock.registerGuard({
      when: () =>
        new Promise<boolean>((resolve) => {
          setLeaving(true);
          timers.add(setTimeout(() => setLeaving(false), wait * 1000 + 2500));
          timers.add(setTimeout(() => resolve(false), wait * 1000));
        }),
    });
    return () => {
      unregister();
      timers.forEach(clearTimeout);
    };
  }, [dock, reduced, wait]);

  return (
    <LeavingContext value={leaving}>
      <main
        className={cn(
          "overflow-x-clip",
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

function useOpticalInset(
  ref: { current: HTMLElement | null },
  text: string,
  enabled: boolean,
) {
  useEffect(() => {
    const element = ref.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!enabled || !element || !context) return;
    const size = 400;
    const origin = size / 4;
    canvas.width = size * 2;
    canvas.height = size * 1.5;

    const fit = () => {
      const style = getComputedStyle(element);
      const first = text.trimStart().charAt(0);
      const glyph =
        style.textTransform === "uppercase" ? first.toUpperCase() : first;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
      context.fillStyle = "#fff";
      context.fillText(glyph, origin, size * 1.1);
      const { data, width, height } = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (data[(y * width + x) * 4 + 3] > 127) {
            element.style.marginLeft = `${-(x - origin) / size}em`;
            return;
          }
        }
      }
    };
    fit();
    void document.fonts.ready.then(fit);
  }, [enabled, ref, text]);
}

export function CinemaTitle({
  centered = false,
  children: title,
  className,
}: {
  centered?: boolean;
  children: string;
  className?: string;
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
      style={{ y: drift }}
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

export function Drift({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const scrollY = useScrollY();
  const y = useTransform(scrollY, [0, 600], [0, -56]);
  return (
    <motion.div className={className} style={{ y }} suppressHydrationWarning>
      {children}
    </motion.div>
  );
}

export function DrawnRule({ className }: { className?: string }) {
  const leaving = useLeaving();
  const { exit, rule } = useScore();
  return (
    <motion.div
      animate={leaving ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
      aria-hidden="true"
      className={cn(
        "h-px w-full bg-white/25",
        rule.origin === "left" ? "origin-left" : "origin-center",
        className,
      )}
      initial={{ opacity: 0, scaleX: 0 }}
      transition={
        leaving
          ? { duration: exit.rule.duration, ease: EASE.glide }
          : { delay: rule.delay, duration: rule.duration, ease: EASE.expo }
      }
    />
  );
}

const TAGS = {
  div: motion.div,
  li: motion.li,
  p: motion.p,
  section: motion.section,
  ul: motion.ul,
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
  return (
    <Component
      animate={shown ? { filter: blur(0), opacity: 1, y: 0 } : undefined}
      className={className}
      initial={{
        filter: blur(blurPx),
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

const CascadeCount = createContext<(() => () => void) | null>(null);

export function Cascade({
  as = "div",
  children,
  className,
  exit = false,
  intro = 0,
  lead = 0,
  stagger,
}: {
  as?: Extract<Tag, "div" | "ul">;
  children: ReactNode;
  className?: string;
  exit?: boolean;
  intro?: number;
  lead?: number;
  stagger?: number;
}) {
  const score = useScore();
  const section = useSection();
  const { delay, hold, ref, shown } = useReveal<HTMLDivElement>({
    gate: section === null,
    intro,
    step: section?.lead,
  });
  const step = stagger ?? score.scroll.stagger;
  const variants = useMemo(() => cascadeGroup(score, step), [score, step]);
  const items = useRef(0);
  const enlist = useCallback(() => {
    items.current += 1;
    return () => {
      items.current -= 1;
    };
  }, []);
  const Component = TAGS[as] as typeof motion.div;

  const arrival = useRef({ delay, hold, lead, step });
  useEffect(() => {
    arrival.current = { delay, hold, lead, step };
  });
  useEffect(() => {
    if (!shown) return;
    const { delay, hold, lead, step } = arrival.current;
    hold(
      delay +
        lead +
        Math.max(items.current - 1, 0) * step +
        landed(score.scroll.duration),
    );
  }, [score.scroll.duration, shown]);

  return (
    <CascadeCount value={enlist}>
      <Component
        animate={shown ? "visible" : "hidden"}
        className={className}
        custom={delay + lead}
        exit={exit ? "exit" : undefined}
        initial="hidden"
        ref={ref}
        variants={variants}
      >
        {children}
      </Component>
    </CascadeCount>
  );
}

export function CascadeItem({
  as = "div",
  children,
  className,
  from = "up",
}: {
  as?: Extract<Tag, "div" | "li">;
  children: ReactNode;
  className?: string;
  from?: "left" | "right" | "scale" | "up";
}) {
  const score = useScore();
  const enlist = useContext(CascadeCount);
  const variants = useMemo(() => cascadeItems(score), [score]);
  const Component = TAGS[as] as typeof motion.div;
  useEffect(() => enlist?.(), [enlist]);
  return (
    <Component className={className} variants={variants[from]}>
      {children}
    </Component>
  );
}

export function TabSwap({
  as,
  children,
  className,
  id,
  intro = 0,
  stagger,
}: {
  as?: "div" | "ul";
  children: ReactNode;
  className?: string;
  id: string;
  intro?: number;
  stagger?: number;
}) {
  const { swap } = useScore();
  return (
    <AnimatePresence initial mode="wait">
      <Cascade
        as={as}
        className={className}
        exit
        intro={intro}
        key={id}
        lead={swap.delay}
        stagger={stagger}
      >
        {children}
      </Cascade>
    </AnimatePresence>
  );
}
