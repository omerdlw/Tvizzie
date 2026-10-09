"use client";

import {
  Children,
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  animate,
  motion,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { Button, Icon } from "@/ui";
import { SCENE } from "../lib/motion";
import { EASE, LANDED, settle, size } from "../lib/tempo";
import { LeadContext, useSection } from "./cue";

const EDGE_TOLERANCE = 4;
const DRAG_THRESHOLD = 5;
const SCROLL_STEP = 0.8;
const SLIDE_THRESHOLD = 0.3;

interface ScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

function readScrollState(element: HTMLElement): ScrollState {
  return {
    canScrollLeft: element.scrollLeft > EDGE_TOLERANCE,
    canScrollRight:
      element.scrollLeft + element.clientWidth <
      element.scrollWidth - EDGE_TOLERANCE,
  };
}

function useDragScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let startX = 0;
    let startLeft = 0;
    let pressed = false;
    let dragged = false;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pressed = true;
      dragged = false;
      startX = event.clientX;
      startLeft = element.scrollLeft;
    };
    const onMove = (event: PointerEvent) => {
      if (!pressed) return;
      const delta = event.clientX - startX;
      if (!dragged && Math.abs(delta) > DRAG_THRESHOLD) {
        dragged = true;
        element.dataset.dragging = "true";
      }
      if (dragged) element.scrollLeft = startLeft - delta;
    };
    const onUp = () => {
      pressed = false;
      delete element.dataset.dragging;
    };
    const onClickCapture = (event: MouseEvent) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };

    element.addEventListener("pointerdown", onDown);
    element.addEventListener("click", onClickCapture, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [ref]);
}

const SlideContext = createContext<{
  delays: Readonly<Record<number, number>>;
  register: (index: number, element: HTMLElement | null) => void;
} | null>(null);

const SHUT = "inset(100% 0% 0% 0% round 20px)";
const OPEN = "inset(0% 0% 0% 0% round 20px)";

function Slide({
  children,
  className,
  index,
}: {
  children: ReactNode;
  className?: string;
  index: number;
}) {
  const stage = use(SlideContext);
  const reduced = useReducedMotion();
  const slide = SCENE.slides;
  const delay = stage?.delays[index];
  const shown = delay !== undefined;
  const instant = { duration: 0 };
  return (
    <div
      className={className}
      ref={(element) => stage?.register(index, element)}
    >
      <motion.div
        animate={
          shown
            ? { clipPath: OPEN, transitionEnd: { clipPath: "none" } }
            : undefined
        }
        className="h-full rounded-[inherit]"
        initial={{ clipPath: SHUT }}
        transition={
          reduced
            ? instant
            : { delay: delay ?? 0, duration: slide.run, ease: EASE.silk }
        }
      >
        <motion.div
          animate={shown ? { scale: 1 } : undefined}
          className="h-full"
          initial={{ scale: slide.zoom }}
          transition={
            reduced
              ? instant
              : { delay: delay ?? 0, duration: slide.run, ease: EASE.expo }
          }
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}

const ARROW_STYLE = { transitionDuration: `${size(1)}s` };

const ARROW_CLASS =
  "center absolute top-1/2 z-10 size-9 -translate-y-1/2 transition-[opacity,scale,background-color] ease-out-expo cursor-pointer rounded-full bg-white/70 text-black shadow-md ring-1 ring-black/10 ring-inset hover:bg-white sm:size-10";

const arrowState = (visible: boolean) =>
  visible ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-75";

interface CarouselProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  label?: string;
}

function slideEdges(track: HTMLElement): number[] {
  return Array.from(
    track.children,
    (child) => (child as HTMLElement).offsetLeft - track.offsetLeft,
  );
}

function glideTarget(track: HTMLElement, direction: -1 | 1): number {
  const max = track.scrollWidth - track.clientWidth;
  const wanted = track.scrollLeft + track.clientWidth * SCROLL_STEP * direction;
  const edges = slideEdges(track).filter((edge) => edge <= max);
  if (edges.length === 0) return Math.min(max, Math.max(0, wanted));

  let target = edges.reduce((best, edge) =>
    Math.abs(edge - wanted) < Math.abs(best - wanted) ? edge : best,
  );
  if (direction === 1 && target <= track.scrollLeft + EDGE_TOLERANCE) {
    target =
      edges.find((edge) => edge > track.scrollLeft + EDGE_TOLERANCE) ?? max;
  }
  if (direction === -1 && target >= track.scrollLeft - EDGE_TOLERANCE) {
    target =
      [...edges]
        .reverse()
        .find((edge) => edge < track.scrollLeft - EDGE_TOLERANCE) ?? 0;
  }
  if (direction === 1 && max - target < track.clientWidth * 0.25) target = max;
  if (direction === -1 && target < track.clientWidth * 0.25) target = 0;
  return target;
}

export function Carousel({
  children,
  className,
  itemClassName,
  label,
}: CarouselProps) {
  const reduced = useReducedMotion();
  const slide = SCENE.slides;
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLElement | null)[]>([]);
  const rowOpen = useRef(false);
  const opening = useRef(true);
  const waiting = useRef(new Set<number>());
  const seen = useRef(0);
  const section = useSection();
  const swapLead = use(LeadContext);
  const sectionRef = useRef(section);
  useEffect(() => {
    sectionRef.current = section;
  }, [section]);
  const spanKey = useId();
  const glide = useRef<AnimationPlaybackControls | null>(null);
  const [delays, setDelays] = useState<Readonly<Record<number, number>>>({});
  const [state, setState] = useState<ScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [landedCards, setLandedCards] = useState(false);
  const landing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = Children.count(children);
  useDragScroll(trackRef);

  const sync = useCallback(() => {
    const element = trackRef.current;
    if (!element) return;
    const next = readScrollState(element);
    setState((previous) =>
      previous.canScrollLeft === next.canScrollLeft &&
      previous.canScrollRight === next.canScrollRight
        ? previous
        : next,
    );
  }, []);

  useEffect(() => {
    const element = trackRef.current;
    if (!element) return;
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => observer.disconnect();
  }, [sync, children]);

  const register = useCallback((index: number, element: HTMLElement | null) => {
    slides.current[index] = element;
  }, []);

  const release = useCallback(
    (indexes: number[], lead: number) => {
      if (indexes.length === 0) return;
      const ordered = [...indexes].sort((a, b) => a - b);
      const run = (ordered.length - 1) * slide.gap;
      const arrival = lead + run + LANDED * slide.run;
      setDelays((previous) => {
        const next = { ...previous };
        ordered.forEach((index, order) => {
          next[index] ??=
            lead + settle(order, ordered.length, run, SCENE.items.bend);
        });
        return next;
      });
      if (landing.current) clearTimeout(landing.current);
      landing.current = setTimeout(
        () => setLandedCards(true),
        (arrival + slide.arrow) * 1000,
      );
    },
    [slide],
  );
  useEffect(
    () => () => {
      if (landing.current) clearTimeout(landing.current);
    },
    [],
  );

  const openRow = useCallback(
    (lead: number) => {
      rowOpen.current = true;
      if (waiting.current.size > 0) opening.current = false;
      release([...waiting.current], lead);
      waiting.current.clear();
    },
    [release],
  );

  const sectionShown = section?.opened != null;
  useEffect(() => {
    const element = rowRef.current;
    if (!element) return;
    if (section) {
      if (sectionShown) {
        openRow(Math.max(section.after(SCENE.section.lead), swapLead));
      }
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        openRow(0);
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [openRow, sectionShown]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const arrived: number[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const index = slides.current.indexOf(entry.target as HTMLElement);
          if (index < 0) continue;
          if (rowOpen.current) arrived.push(index);
          else waiting.current.add(index);
        }
        const held = sectionRef.current;
        const lead = opening.current
          ? Math.max(
              held?.opened ? held.after(SCENE.section.lead) : 0,
              swapLead,
            )
          : 0;
        if (arrived.length > 0) opening.current = false;
        release(arrived, lead);
      },
      { root: track, threshold: SLIDE_THRESHOLD },
    );
    for (const element of slides.current.slice(0, count)) {
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [count, release, swapLead]);

  useEffect(() => {
    const track = trackRef.current;
    const report = sectionRef.current?.report;
    if (!track || !report) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          seen.current += 1;
        }
        if (seen.current === 0) return;
        report(
          spanKey,
          SCENE.section.lead +
            (seen.current - 1) * slide.gap +
            SCENE.section.tail,
        );
      },
      { root: track, threshold: SLIDE_THRESHOLD },
    );
    for (const element of slides.current.slice(0, count)) {
      if (element) observer.observe(element);
    }
    return () => {
      observer.disconnect();
      seen.current = 0;
      report(spanKey, null);
    };
  }, [count, slide, spanKey]);

  const stopGlide = () => glide.current?.stop();

  const scrollBy = (direction: -1 | 1) => {
    const element = trackRef.current;
    if (!element) return;
    stopGlide();
    const target = glideTarget(element, direction);
    if (reduced) {
      element.scrollLeft = target;
      return;
    }
    glide.current = animate(element.scrollLeft, target, {
      duration: slide.glide,
      ease: EASE.expo,
      onUpdate: (value) => {
        element.scrollLeft = value;
      },
    });
  };

  const stage = useMemo(() => ({ delays, register }), [delays, register]);

  return (
    <div
      aria-label={label}
      aria-roledescription="carousel"
      className="relative w-full"
      data-exit=""
      ref={rowRef}
      role="group"
    >
      <div
        className={cn(
          "flex cursor-grab touch-pan-y gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[20px] select-none data-[dragging=true]:cursor-grabbing",
          className,
        )}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={stopGlide}
        onScroll={sync}
        onTouchStart={stopGlide}
        onWheel={stopGlide}
        ref={trackRef}
      >
        <SlideContext value={stage}>
          {Children.toArray(children).map((child, index) => (
            <Slide
              className={cn(
                "cine-slide shrink-0 rounded-[20px]",
                itemClassName,
              )}
              index={index}
              key={(child as { key?: string }).key ?? index}
            >
              {child}
            </Slide>
          ))}
        </SlideContext>
      </div>

      <Button
        aria-hidden={!(landedCards && state.canScrollLeft)}
        aria-label="Scroll left"
        className={cn(
          ARROW_CLASS,
          "left-2 sm:left-3",
          arrowState(landedCards && state.canScrollLeft),
        )}
        onClick={() => scrollBy(-1)}
        style={ARROW_STYLE}
        tabIndex={landedCards && state.canScrollLeft ? 0 : -1}
      >
        <Icon icon="solar:alt-arrow-left-bold" size={18} />
      </Button>
      <Button
        aria-hidden={!(landedCards && state.canScrollRight)}
        aria-label="Scroll right"
        className={cn(
          ARROW_CLASS,
          "right-2 sm:right-3",
          arrowState(landedCards && state.canScrollRight),
        )}
        onClick={() => scrollBy(1)}
        style={ARROW_STYLE}
        tabIndex={landedCards && state.canScrollRight ? 0 : -1}
      >
        <Icon icon="solar:alt-arrow-right-bold" size={18} />
      </Button>
    </div>
  );
}
