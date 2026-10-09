"use client";

import {
  createContext,
  use,
  useCallback,
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
  motion,
  useMotionValue,
  animate,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react";
import { layoutTop, useHeldHeight } from "@/motion/flow";
import { useScrollY } from "@/motion/scroll";
import { Icon } from "@/ui";
import { SCENE } from "../lib/motion";
import {
  DIM,
  EASE,
  FOCUSED,
  ITEMS,
  exposure,
  settle,
  type ItemKind,
} from "../lib/tempo";
import { ClockContext } from "./clock";
import {
  GroupContext,
  LeadContext,
  SectionContext,
  remaining,
  useCue,
  useSection,
} from "./cue";
import { Decode } from "./type";

const unit = (value: number) => Math.min(1, Math.max(0, value));

function useSectionScroll(ref: RefObject<HTMLElement | null>) {
  const scrollY = useScrollY();
  const box = useRef({ top: 0, view: 1 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      box.current = {
        top: layoutTop(element),
        view: window.innerHeight,
      };
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);

  const enter = useTransform(scrollY, (y) => {
    const { top, view } = box.current;
    return unit((y - (top - view)) / (view * 0.6));
  });
  const through = useTransform(scrollY, (y) => {
    const { top, view } = box.current;
    return unit((y - (top - view)) / (view * 2.5));
  });
  return { enter, through };
}

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
  const { enter, through } = useSectionScroll(ref);
  const opened = useMemo(
    () => (shown ? { at, delay } : null),
    [at, delay, shown],
  );
  const clock = useSectionClock(opened);
  const after = useCallback(
    (step: number) =>
      opened ? remaining(opened, step, performance.now()) : step,
    [opened],
  );
  const value = useMemo(
    () => ({ after, enter, opened, report, through }),
    [after, enter, opened, report, through],
  );
  const group = useMemo(() => ({ opened }), [opened]);
  return (
    <SectionContext value={value}>
      <GroupContext value={group}>
        <ClockContext value={clock}>
          <section className={className} data-flow="" ref={ref}>
            {children}
          </section>
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
    const { at, run } = SCENE.section.name;
    const end = at + run;
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

function Part({
  at,
  children,
  className,
  exit = false,
  flow = false,
  run,
}: {
  at: number;
  children: ReactNode;
  className?: string;
  exit?: boolean;
  flow?: boolean;
  run: number;
}) {
  const { delay, ref, shown } = useCue<HTMLDivElement>({ step: at });
  const { y } = SCENE.section;
  return (
    <motion.div
      animate={
        shown
          ? {
              filter: "brightness(1)",
              opacity: 1,
              transitionEnd: FOCUSED,
              y: 0,
            }
          : undefined
      }
      className={className}
      data-exit={exit ? "" : undefined}
      data-flow={flow ? "" : undefined}
      initial={{ filter: exposure(DIM), opacity: 0, y }}
      ref={ref}
      transition={{ delay, duration: run, ease: EASE.expo }}
    >
      {children}
    </motion.div>
  );
}

function Rule() {
  const { at, run } = SCENE.section.rule;
  const { delay, ref, shown } = useCue<HTMLDivElement>({ step: at });
  return (
    <motion.div
      animate={shown ? { opacity: 1, scaleX: 1 } : undefined}
      aria-hidden="true"
      className="h-px min-w-6 flex-1 origin-left bg-white/10"
      initial={{ opacity: 0, scaleX: 0 }}
      ref={ref}
      transition={{ delay, duration: run, ease: EASE.expo }}
    />
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
    step: SCENE.section.lead,
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
        duration: SCENE.section.rule.run,
        ease: EASE.expo,
      }}
    />
  );
}

function Bar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const section = useSection();
  const reduced = useReducedMotion();
  const idle = useMotionValue(0);
  const { drift } = SCENE.scrub;
  const y = useTransform(section?.through ?? idle, [0, 1], [drift, -drift]);
  return (
    <motion.div
      className={className}
      style={section && !reduced ? { y } : undefined}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}

function Name({ children }: { children: string }) {
  const section = useSection();
  const reduced = useReducedMotion();
  const idle = useMotionValue(1);
  const { name } = SCENE.section;
  const ink = useTransform(
    section?.enter ?? idle,
    [0, 1],
    ["rgb(252 252 251 / 0.3)", "rgb(252 252 251 / 0.7)"],
  );
  return (
    <motion.h2
      className="min-w-0 text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase"
      style={section && !reduced ? { color: ink } : undefined}
      suppressHydrationWarning
    >
      <Decode run={name.run} since={name.at}>
        {children}
      </Decode>
    </motion.h2>
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
  const { actions: tabs, name, rule } = SCENE.section;
  useSpan(
    SCENE.section.tail + Math.max(name.at, rule.at, actions ? tabs.at : 0),
  );
  return (
    <div className="relative z-10 mb-4" data-exit="lead">
      <Bar className="flex min-h-8 w-full items-center gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <Part at={name.at} className="flex shrink-0" run={name.run}>
            <Icon className="text-white/70" icon={icon} size={18} />
          </Part>
          <Name>{title}</Name>
        </div>
        <Rule />
        {actions ? (
          <Part at={tabs.at} className="min-w-0" run={tabs.run}>
            {actions}
          </Part>
        ) : null}
      </Bar>
    </div>
  );
}

export function Beat({
  at = SCENE.section.lead,
  children,
}: {
  at?: number;
  children: ReactNode;
}) {
  const { run } = SCENE.section.actions;
  useSpan(SCENE.section.tail + at);
  return (
    <Part at={at} exit flow run={run}>
      {children}
    </Part>
  );
}

const TAGS = { div: motion.div, li: motion.li, ul: motion.ul } as const;

const CascadeContext = createContext<(() => () => void) | null>(null);

const group = (gap: number): Variants => ({
  exit: {
    filter: exposure(DIM),
    opacity: 0,
    transition: { duration: SCENE.swap.leave, ease: EASE.glide },
    y: -14,
  },
  hidden: {},
  visible: (lead: number = 0) => ({
    transition: {
      delayChildren: (index: number, count: number) =>
        lead + settle(index, count, (count - 1) * gap, SCENE.items.bend),
    },
  }),
});

export function Cascade({
  as = "div",
  children,
  className,
  exit = false,
  free = false,
  gap = SCENE.items.gap,
  lead = 0,
}: {
  as?: keyof typeof TAGS;
  children: ReactNode;
  className?: string;
  exit?: boolean;
  free?: boolean;
  gap?: number;
  lead?: number;
}) {
  const inside = useSection();
  const section = free ? null : inside;
  const { delay, ref, shown } = useCue<HTMLDivElement>({
    step: section ? SCENE.section.lead : undefined,
  });
  const variants = useMemo(() => group(gap), [gap]);
  const Component = TAGS[as] as typeof motion.div;

  const key = useId();
  const report = section?.report;
  const items = useRef(0);
  const publish = useRef(() => {});
  useEffect(() => {
    publish.current = () => {
      if (!report || items.current === 0) return report?.(key, null);
      const last = (items.current - 1) * gap;
      report(key, SCENE.section.lead + lead + last + SCENE.section.tail);
    };
    publish.current();
    return () => report?.(key, null);
  }, [gap, key, lead, report]);
  const enroll = useCallback(() => {
    items.current += 1;
    publish.current();
    return () => {
      items.current -= 1;
      publish.current();
    };
  }, []);

  return (
    <CascadeContext value={enroll}>
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
    </CascadeContext>
  );
}

export function Item({
  as = "div",
  children,
  className,
  from = "up",
}: {
  as?: "div" | "li";
  children: ReactNode;
  className?: string;
  from?: ItemKind;
}) {
  const enroll = use(CascadeContext);
  useEffect(() => enroll?.(), [enroll]);
  const Component = TAGS[as] as typeof motion.div;
  return (
    <Component className={className} data-exit="" variants={ITEMS[from]}>
      {children}
    </Component>
  );
}

export function Swap({
  as,
  children,
  className,
  gap,
  id,
}: {
  as?: "div" | "ul";
  children: ReactNode;
  className?: string;
  gap?: number;
  id: string;
}) {
  const [seen, setSeen] = useState({ id, swapped: false });
  if (seen.id !== id) setSeen({ id, swapped: true });
  const lead = seen.swapped ? SCENE.swap.lead : 0;
  const box = useHeldHeight(id);
  return (
    <LeadContext value={lead}>
      <div ref={box}>
        <AnimatePresence initial mode="wait">
          <Cascade
            as={as}
            className={className}
            exit
            gap={gap}
            key={id}
            lead={lead}
          >
            {children}
          </Cascade>
        </AnimatePresence>
      </div>
    </LeadContext>
  );
}
