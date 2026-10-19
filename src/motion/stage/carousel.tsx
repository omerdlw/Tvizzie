"use client";

import {
  Children,
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  animate,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { Button, Icon } from "@/ui";
import { GRAMMAR } from "./grammar";
import { EASE, LANDED, size } from "./tempo";
import { ClockContext } from "./clock";
import { Develop } from "./develop";
import { useArrival, useArrivalClock } from "./wave";

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

const SlideContext = createContext<((delay: number) => void) | null>(null);

// A slide develops like any picture on the page, once it is in view: the
// track's own clipping counts, so a slide dragged in from the side arrives
// as it comes into the frame.
function Slide({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const arrived = use(SlideContext);
  const { delay, ref, shown } = useArrival<HTMLDivElement>();
  const clock = useArrivalClock(shown, delay);
  const slide = GRAMMAR.slides;
  useEffect(() => {
    if (shown) arrived?.(delay);
  }, [shown]);
  return (
    <div className={className} ref={ref}>
      <ClockContext value={clock}>
        <Develop
          className="h-full rounded-[inherit]"
          radius={20}
          run={slide.run}
          zoom={slide.zoom}
        >
          {children}
        </Develop>
      </ClockContext>
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
  // Called as the track comes within a view of its end, so a long row can be
  // laid out a stretch at a time instead of all at once.
  onNearEnd?: () => void;
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
  onNearEnd,
}: CarouselProps) {
  const reduced = useReducedMotion();
  const slide = GRAMMAR.slides;
  const trackRef = useRef<HTMLDivElement>(null);
  const glide = useRef<AnimationPlaybackControls | null>(null);
  const [state, setState] = useState<ScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });
  // The arrows wait for the first slides to have all but landed.
  const [landedCards, setLandedCards] = useState(false);
  const landing = useRef<ReturnType<typeof setTimeout> | null>(null);
  useDragScroll(trackRef);

  const nearEnd = useRef(onNearEnd);
  useEffect(() => {
    nearEnd.current = onNearEnd;
  }, [onNearEnd]);
  const sync = useCallback(() => {
    const element = trackRef.current;
    if (!element) return;
    const { clientWidth, scrollLeft, scrollWidth } = element;
    // A track that is not laid out (its page put away for the wall) is at
    // no end at all.
    if (clientWidth > 0 && scrollLeft + clientWidth * 2 >= scrollWidth) {
      nearEnd.current?.();
    }
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

  const arrived = useCallback(
    (delay: number) => {
      if (landing.current) return;
      landing.current = setTimeout(
        () => setLandedCards(true),
        (delay + LANDED * slide.run + slide.arrow) * 1000,
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
      ease: EASE.dolly,
      onUpdate: (value) => {
        element.scrollLeft = value;
      },
    });
  };

  return (
    <div
      aria-label={label}
      aria-roledescription="carousel"
      className="relative w-full"
      data-exit=""
      role="group"
    >
      <div
        className={cn(
          "flex cursor-grab touch-pan-y gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[20px] select-none data-[dragging=true]:cursor-grabbing",
          className,
        )}
        data-cursor="drag"
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={stopGlide}
        onScroll={sync}
        onTouchStart={stopGlide}
        onWheel={stopGlide}
        ref={trackRef}
      >
        <SlideContext value={arrived}>
          {Children.toArray(children).map((child, index) => (
            <Slide
              className={cn(
                "cine-slide shrink-0 rounded-[20px]",
                itemClassName,
              )}
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
