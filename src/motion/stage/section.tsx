"use client";

import {
  createContext,
  use,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useHeldHeight } from "@/motion/flow";
import { Icon } from "@/ui";
import { GRAMMAR } from "./grammar";
import { EASE, ITEMS, type ItemKind } from "./tempo";
import { ClockContext, ease, unit } from "./clock";
import {
  GroupContext,
  SectionContext,
  remaining,
  useCue,
  useSection,
} from "./cue";
import { Expose, clearMask, setMask } from "./type";
import { WaveContext, useArrival, useArrivalClock, useWave } from "./wave";

// When the content of a section opened at `opened` may begin.
const contentFrom = (opened: { at: number; delay: number }) =>
  opened.at + (opened.delay + GRAMMAR.section.lead) * 1000;

export function Section({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const spans = useRef(new Map<string, number>());
  const span = useCallback(() => Math.max(0, ...spans.current.values()), []);
  const report = useCallback((key: string, seconds: number | null) => {
    if (seconds === null) spans.current.delete(key);
    else spans.current.set(key, seconds);
  }, []);
  const { at, delay, ref, shown } = useCue<HTMLElement>({ gate: true, span });
  const opened = useMemo(
    () => (shown ? { at, delay } : null),
    [at, delay, shown],
  );
  const clock = useSectionClock(opened);
  const wave = useWave(opened ? contentFrom(opened) : null, GRAMMAR.items.gap);
  const after = useCallback(
    (step: number) =>
      opened ? remaining(opened, step, performance.now()) : step,
    [opened],
  );
  const value = useMemo(
    () => ({ after, opened, report }),
    [after, opened, report],
  );
  const group = useMemo(() => ({ opened }), [opened]);
  return (
    <SectionContext value={value}>
      <GroupContext value={group}>
        <ClockContext value={clock}>
          <WaveContext value={wave}>
            <section className={className} data-flow="" ref={ref}>
              {children}
            </section>
          </WaveContext>
        </ClockContext>
      </GroupContext>
    </SectionContext>
  );
}

function useSectionClock(opened: { at: number; delay: number } | null) {
  const time = useMotionValue(-1);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!opened) return;
    const end = GRAMMAR.section.sweep.run;
    if (reduced) {
      time.set(end);
      return;
    }
    const begun = (performance.now() - opened.at) / 1000 - opened.delay;
    time.set(begun);
    const controls = animate(time, end, {
      duration: Math.max(0, end - begun),
      ease: "linear",
    });
    return () => controls.stop();
  }, [opened, reduced, time]);
  return time;
}

function useSpan(seconds: number | null) {
  const report = useSection()?.report;
  const key = useId();
  useEffect(() => {
    if (!report || seconds === null) return;
    report(key, seconds);
    return () => report(key, null);
  }, [key, report, seconds]);
}

// The light crossing a header: how far, in pixels from its left edge, it has
// come. It moves like a pan, out of rest and slowly into it, over one sweep.
const HeadContext = createContext<{
  bar: RefObject<HTMLDivElement | null>;
  head: MotionValue<number>;
} | null>(null);

function useHead(bar: RefObject<HTMLDivElement | null>) {
  const clock = useContext(ClockContext);
  const past = useMotionValue(1e6);
  const width = useMotionValue(0);
  const { run } = GRAMMAR.section.sweep;

  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const measure = () => width.set(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bar, width]);

  return useTransform(
    [clock ?? past, width],
    ([time, span]: number[]) => span * ease.dolly(unit(time / run)),
  );
}

// How far the light has crossed one part of the header, 0 before it reaches
// its left edge and 1 once it is `reach(width)` past it.
function useReached(
  part: RefObject<HTMLElement | null>,
  reach: (width: number) => number = (width) => width,
) {
  const header = use(HeadContext);
  const idle = useMotionValue(1e6);
  const place = useRef({ left: 0, span: 1 });

  useEffect(() => {
    const element = part.current;
    const host = header?.bar.current;
    if (!element || !host) return;
    const measure = () => {
      const outer = host.getBoundingClientRect();
      const inner = element.getBoundingClientRect();
      place.current = {
        left: inner.left - outer.left,
        span: Math.max(1, reach(inner.width)),
      };
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    observer.observe(element);
    return () => observer.disconnect();
  }, [header, part]);

  return useTransform(header?.head ?? idle, (head) =>
    unit((head - place.current.left) / place.current.span),
  );
}

// The icon comes up as the light reaches it, out of a soft blur, over the
// width of the light's feather rather than its own few pixels.
function Lamp({ icon }: { icon: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { feather } = GRAMMAR.section.sweep;
  const lit = useReached(ref, (width) => width + feather);
  const opacity = useTransform(lit, (p) => ease.fade(p));
  const filter = useTransform(lit, (p) =>
    p >= 1 ? "none" : `blur(${((1 - ease.fade(p)) * 6).toFixed(2)}px)`,
  );
  return (
    <motion.span
      className="flex shrink-0"
      ref={ref}
      style={{ filter, opacity }}
    >
      <Icon className="text-[rgb(var(--grade)/0.85)]" icon={icon} size={18} />
    </motion.span>
  );
}

// The name is exposed by the light itself: the edge of its print stands
// where the sweep has come to.
const EXPOSE_EDGE = 1.24;

function Name({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const exposed = useReached(ref, (width) => width * EXPOSE_EDGE);
  return (
    <h2
      className="crt-glow min-w-0 text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase"
      ref={ref}
    >
      <Expose sweep={exposed}>{children}</Expose>
    </h2>
  );
}

// The rule is drawn under the light, its end always where the light is, with
// a spark of the film's grade riding that end until it comes to rest.
function Rule() {
  const ref = useRef<HTMLDivElement>(null);
  const drawn = useReached(ref);
  const spark = useTransform(drawn, (p) =>
    p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p) ** 0.5,
  );
  const tip = useTransform(drawn, (p) => `${(p * 100).toFixed(3)}%`);
  return (
    <div aria-hidden="true" className="relative h-px min-w-6 flex-1" ref={ref}>
      <motion.div
        className="absolute inset-0 origin-left bg-[rgb(var(--grade)/0.2)]"
        style={{ scaleX: drawn }}
      />
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-0 w-full"
        style={{ opacity: spark, x: tip }}
      >
        <span className="absolute top-1/2 right-full h-[3px] w-16 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent to-[rgb(var(--grade)/0.9)] blur-[1.5px]" />
      </motion.div>
    </div>
  );
}

// Controls are wiped in from the left as the light reaches them, through a
// soft edge, and stand where they will stay the whole time.
const SOFT = 14;
const UNWIPED = `linear-gradient(90deg, #000 ${-SOFT}%, transparent 0%)`;

function wipe(element: HTMLElement | null, progress: number) {
  if (!element) return;
  if (progress >= 1) {
    clearMask(element);
    return;
  }
  const edge = progress * (100 + SOFT);
  setMask(
    element,
    `linear-gradient(90deg, #000 ${edge - SOFT}%, transparent ${edge}%)`,
  );
}

function Wipe({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const wiped = useReached(ref);
  useMotionValueEvent(wiped, "change", (p) => wipe(ref.current, p));
  useEffect(() => wipe(ref.current, wiped.get()), [wiped]);
  return (
    <div
      className="min-w-0"
      ref={ref}
      style={{ maskImage: UNWIPED, WebkitMaskImage: UNWIPED }}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

export function Header({
  actions,
  icon,
  title,
}: {
  actions?: ReactNode;
  icon: string;
  title: string;
}) {
  useSpan(GRAMMAR.section.span);
  const bar = useRef<HTMLDivElement>(null);
  const head = useHead(bar);
  const header = useMemo(() => ({ bar, head }), [head]);
  return (
    <HeadContext value={header}>
      <div className="relative z-10 mb-4" data-exit="lead">
        <div className="flex min-h-8 w-full items-center gap-4" ref={bar}>
          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            <Lamp icon={icon} />
            <Name>{title}</Name>
          </div>
          <Rule />
          {actions ? <Wipe>{actions}</Wipe> : null}
        </div>
      </div>
    </HeadContext>
  );
}

export function Trace({
  axis,
  className,
}: {
  axis?: "x" | "y";
  className?: string;
}) {
  const { delay, ref, shown } = useCue<HTMLDivElement>({
    step: GRAMMAR.section.lead,
  });
  const from = axis === "x" ? { scaleX: 0 } : axis === "y" ? { scaleY: 0 } : {};
  const to = axis === "x" ? { scaleX: 1 } : axis === "y" ? { scaleY: 1 } : {};
  return (
    <motion.div
      animate={shown ? { opacity: 1, ...to } : undefined}
      aria-hidden="true"
      className={className}
      initial={{ opacity: 0, ...from }}
      ref={ref}
      transition={{
        delay,
        duration: GRAMMAR.section.sweep.run,
        ease: EASE.dolly,
      }}
    />
  );
}

const TAGS = { div: motion.div, li: motion.li, ul: motion.ul } as const;

// Leaving for another tab, content keeps the way it came: on up, out of light.
const LEAVE = {
  opacity: 0,
  transition: { duration: GRAMMAR.swap.leave, ease: EASE.glide },
  y: -12,
};

// `fades`: what it holds fades as it leaves the top of the view a block at a
// time, so the items in it need no fade of their own.
export function Cascade({
  as = "div",
  children,
  className,
  exit = false,
  fades = false,
  free = false,
  gap = GRAMMAR.items.gap,
  lead = 0,
}: {
  as?: keyof typeof TAGS;
  children: ReactNode;
  className?: string;
  exit?: boolean;
  fades?: boolean;
  free?: boolean;
  gap?: number;
  lead?: number;
}) {
  const inside = useSection();
  const section = free ? null : inside;
  const [born] = useState(() => performance.now());
  const own = born + lead * 1000;
  let from: number | null = own;
  if (section) {
    from = section.opened ? Math.max(contentFrom(section.opened), own) : null;
  }
  const wave = useWave(from, gap);
  const Component = TAGS[as] as typeof motion.div;

  return (
    <WaveContext value={wave}>
      <Component
        className={className}
        data-exit={fades ? "" : undefined}
        exit={exit ? LEAVE : undefined}
      >
        {children}
      </Component>
    </WaveContext>
  );
}

// One thing that arrives: it waits to be on screen and for its turn, then
// moves in on the page's arrival curve and keeps its own time from there for
// whatever is inside it.
//
// What is inside it fades as it leaves the top of the view, unless something
// around it already does: a fade inside a fade would darken twice, and each
// one holds a compositor layer for as long as the page is open.
export function Item({
  as = "div",
  children,
  className,
  exit = true,
  flow = false,
  from = "up",
}: {
  as?: "div" | "li";
  children: ReactNode;
  className?: string;
  exit?: boolean;
  flow?: boolean;
  from?: ItemKind;
}) {
  const { delay, ref, shown } = useArrival<HTMLDivElement>();
  const clock = useArrivalClock(shown, delay);
  const Component = TAGS[as] as typeof motion.div;
  return (
    <ClockContext value={clock}>
      <Component
        animate={shown ? "visible" : "hidden"}
        className={className}
        custom={delay}
        data-exit={exit ? "" : undefined}
        data-flow={flow ? "" : undefined}
        initial="hidden"
        ref={ref}
        variants={ITEMS[from]}
      >
        {children}
      </Component>
    </ClockContext>
  );
}

export function Beat({
  children,
  from,
}: {
  children: ReactNode;
  from?: ItemKind;
}) {
  return (
    <Item flow from={from}>
      {children}
    </Item>
  );
}

export function Swap({
  as,
  children,
  className,
  fades,
  gap,
  id,
}: {
  as?: "div" | "ul";
  children: ReactNode;
  className?: string;
  fades?: boolean;
  gap?: number;
  id: string;
}) {
  const [first] = useState(id);
  const lead = id === first ? 0 : GRAMMAR.swap.lead;
  const box = useHeldHeight(id);
  return (
    <div ref={box}>
      <AnimatePresence initial mode="wait">
        <Cascade
          as={as}
          className={className}
          exit
          fades={fades}
          gap={gap}
          key={id}
          lead={lead}
        >
          {children}
        </Cascade>
      </AnimatePresence>
    </div>
  );
}
