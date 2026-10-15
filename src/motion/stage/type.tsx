"use client";

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type Ref,
  type RefObject,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { useBeam } from "@/motion/film";
import { GRAMMAR, sinceBase, undoGap } from "./grammar";
import { focus, settle, spread, wordCount } from "./tempo";
import {
  ClockContext,
  ExitContext,
  ease,
  unit,
  useExit,
  useProgress,
} from "./clock";
function useOpticalInset(ref: { current: HTMLElement | null }, text: string) {
  useEffect(() => {
    const element = ref.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!element || !context) return;
    const box = 400;
    const origin = box / 4;
    canvas.width = box * 2;
    canvas.height = box * 1.5;

    const fit = () => {
      const style = getComputedStyle(element);
      const first = text.trimStart().charAt(0);
      const glyph =
        style.textTransform === "uppercase" ? first.toUpperCase() : first;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = `${style.fontWeight} ${box}px ${style.fontFamily}`;
      context.fillStyle = "#fff";
      context.fillText(glyph, origin, box * 1.1);
      const { data, width, height } = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (data[(y * width + x) * 4 + 3] > 127) {
            element.style.marginLeft = `${-(x - origin) / box}em`;
            return;
          }
        }
      }
    };
    fit();
    void document.fonts.ready.then(fit);
  }, [ref, text]);
}

function TitleWord({
  at,
  children,
  out,
}: {
  at: number;
  children: string;
  out: number;
}) {
  const entered = useProgress(at, GRAMMAR.title.run);
  const left = useExit(out);
  const both = [entered, left];
  const opacity = useTransform(both, ([a, b]: number[]) => a * (1 - b));
  const transform = useTransform(both, ([a, b]: number[]) => {
    const lift = (1 - a) * 108 - b * 108;
    return Math.abs(lift) < 0.01 ? "none" : `translateY(${lift}%)`;
  });
  return (
    <motion.span
      className="film-beam inline-block origin-bottom-left"
      data-beam=""
      style={{ opacity, transform }}
    >
      {children}
    </motion.span>
  );
}

function useInk(lastAt: number, alpha: number) {
  const entered = useProgress(lastAt, 0.6, ease.linear);
  const left = useExit(0, 0.6);
  return useTransform(
    [entered, left],
    ([a, b]: number[]) => `rgb(252 252 251 / ${a * (1 - b) * alpha})`,
  );
}

export function Title({
  children: title,
  className,
}: {
  children: string;
  className?: string;
}) {
  const words = title.split(/\s+/).filter(Boolean);
  const heading = useRef<HTMLHeadingElement>(null);
  useOpticalInset(heading, title);
  useBeam(heading);
  const { title: cue } = GRAMMAR;
  const start = sinceBase(cue.at);
  const gap = undoGap(words.length);
  const last = start + settle(words.length - 1, words.length, cue.window);
  const color = useInk(last + cue.run * 0.5, 1);

  return (
    <motion.h1
      aria-label={title}
      className={cn("relative", className)}
      ref={heading}
      style={{ color }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span
            aria-hidden="true"
            className="-mb-[0.12em] inline-block overflow-hidden pr-[0.04em] pb-[0.12em] align-bottom"
          >
            <TitleWord
              at={start + settle(index, words.length, cue.window)}
              out={index * gap}
            >
              {word}
            </TitleWord>
          </span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </motion.h1>
  );
}

function Word({
  at,
  children,
  ink,
  out,
  ref,
  run,
}: {
  at: number;
  children: string;
  ink: string;
  out: number;
  ref?: Ref<HTMLSpanElement>;
  run: number;
}) {
  const entered = useProgress(at, run);
  const left = useExit(out);
  const both = [entered, left];
  const opacity = useTransform(both, ([a, b]: number[]) => a * (1 - b));
  const transform = useTransform(both, ([a, b]: number[]) => {
    const lift = (1 - a) * 0.4 - b * 0.35;
    return Math.abs(lift) < 0.0005 ? "none" : `translateY(${lift}em)`;
  });
  const filter = useTransform(both, ([a, b]: number[]) =>
    focus((1 - a) * 7 + b * 8),
  );
  return (
    <motion.span
      aria-hidden="true"
      className="inline-block"
      ref={ref}
      style={{ color: ink, filter, opacity, transform }}
    >
      {children}
    </motion.span>
  );
}

interface Placed {
  across: number;
  line: number;
}

// Where each word fell once the paragraph was set: which line, and how far
// along it. Measured from the layout, so it follows the column, the font
// arriving and every reflow after.
function useLines(
  box: RefObject<HTMLParagraphElement | null>,
  words: RefObject<(HTMLSpanElement | null)[]>,
  on: boolean,
) {
  const [placed, setPlaced] = useState<Placed[] | null>(null);

  useLayoutEffect(() => {
    const element = box.current;
    if (!on || !element) return;
    const measure = () => {
      const width = element.clientWidth || 1;
      const next: Placed[] = [];
      let line = -1;
      let top = -Infinity;
      let start = 0;
      for (const word of words.current) {
        if (!word) continue;
        if (word.offsetTop > top + word.offsetHeight / 2) {
          line += 1;
          top = word.offsetTop;
          start = word.offsetLeft;
        }
        next.push({ across: (word.offsetLeft - start) / width, line });
      }
      setPlaced((current) =>
        current &&
        current.length === next.length &&
        current.every(
          (place, index) =>
            place.line === next[index].line &&
            Math.abs(place.across - next[index].across) < 0.01,
        )
          ? current
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [box, on, words]);

  return placed;
}

export function Words({
  alpha = 0.7,
  at,
  by = "word",
  cap,
  children: text,
  className,
  run,
  sweep = 0,
  window,
}: {
  alpha?: number;
  at: number;
  by?: "line" | "word";
  cap: number;
  children: string;
  className?: string;
  run: number;
  sweep?: number;
  window: number;
}) {
  const tokens = text.split(/(\s+)/);
  const count = wordCount(text);
  const box = useRef<HTMLParagraphElement>(null);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const placed = useLines(box, spans, by === "line");
  const lines = placed ? (placed[placed.length - 1]?.line ?? 0) + 1 : 1;
  const steps = by === "line" ? lines : count;
  const gap = spread(steps, window, cap);
  const out = undoGap(steps);
  const start = sinceBase(at);
  const tail = by === "line" ? sweep : 0;
  const color = useInk(
    start + Math.max(steps - 1, 0) * gap + tail + run * 0.5,
    alpha,
  );
  const ink = `rgb(252 252 251 / ${alpha})`;
  let index = 0;

  // A paragraph is read by the line, so it comes into focus by the line: each
  // line is pulled sharp in turn, with a short pass of light along it.
  const cue = (order: number) => {
    if (by === "word") return { at: start + order * gap, out: order * out };
    const place = placed?.[order] ?? { across: 0, line: 0 };
    return {
      at: start + place.line * gap + place.across * sweep,
      out: place.line * out,
    };
  };

  return (
    <motion.p className={className} ref={box} style={{ color }}>
      <span className="sr-only">{text}</span>
      {tokens.map((token, position) => {
        if (!token) return null;
        if (/^\s+$/.test(token)) return token;
        const order = index++;
        const timing = cue(order);
        return (
          <Word
            at={timing.at}
            ink={ink}
            key={position}
            out={timing.out}
            ref={(element) => {
              spans.current[order] = element;
            }}
            run={run}
          >
            {token}
          </Word>
        );
      })}
    </motion.p>
  );
}

// Exposure: a band of light crosses the words and leaves them printed behind
// it, a little over-exposed where it passes, in the film's own grade. Leaving,
// the same light burns them away.
const EDGE = 24;
const BAND = 34;
const LIGHT = "rgb(255 253 247)";
const HALATION =
  "0 0 0.3em rgb(var(--grade) / 0.95), 0 0 0.9em rgb(var(--grade) / 0.55)";
const GLINT = 0.55;

function setMask(element: HTMLElement, image: string) {
  element.style.setProperty("mask-image", image);
  element.style.setProperty("-webkit-mask-image", image);
}

function clearMask(element: HTMLElement) {
  element.style.removeProperty("mask-image");
  element.style.removeProperty("-webkit-mask-image");
}

const edgeAt = (progress: number) => (100 + EDGE) * ease.silk(progress);

function shine(light: HTMLElement, edge: number, level: number) {
  setMask(
    light,
    `linear-gradient(90deg, transparent ${edge - BAND}%, #000 ${edge - EDGE * 0.4}%, transparent ${edge + 3}%)`,
  );
  light.style.opacity = level.toFixed(3);
}

export function Expose({
  as = "span",
  at = 0,
  children: text,
  className,
  hover = false,
  out,
  run = GRAMMAR.facts.expose,
  since,
}: {
  as?: "div" | "p" | "span";
  at?: number;
  children: string;
  className?: string;
  hover?: boolean;
  out?: number;
  run?: number;
  since?: number;
}) {
  const reduced = useReducedMotion();
  const clock = useContext(ClockContext);
  const exit = useContext(ExitContext);
  const print = useRef<HTMLSpanElement>(null);
  const light = useRef<HTMLSpanElement>(null);
  const phase = useRef<"burnt" | "dark" | "exposing" | "printed">("dark");
  const glinting = useRef<ReturnType<typeof animate> | null>(null);
  const still = useMotionValue(-1);
  const Tag = as as ElementType;
  const start = since ?? sinceBase(at);

  const printed = () => {
    const p = print.current;
    const l = light.current;
    if (!p || !l) return;
    phase.current = "printed";
    clearMask(p);
    p.style.opacity = "1";
    l.style.opacity = "0";
  };

  const expose = (progress: number, burning: boolean) => {
    const p = print.current;
    const l = light.current;
    if (!p || !l) return;
    const edge = edgeAt(progress);
    setMask(
      p,
      burning
        ? `linear-gradient(90deg, transparent ${edge - EDGE}%, #000 ${edge}%)`
        : `linear-gradient(90deg, #000 ${edge - EDGE}%, transparent ${edge}%)`,
    );
    p.style.opacity = "1";
    shine(l, edge, Math.sin(Math.PI * progress) ** 0.6);
  };

  const coming = (time: number) => {
    const p = print.current;
    if (!p || glinting.current || phase.current === "burnt") return;
    const progress = unit((time - start) / run);
    if (reduced || progress >= 1) {
      if (phase.current !== "printed") printed();
      return;
    }
    if (progress <= 0) {
      phase.current = "dark";
      clearMask(p);
      p.style.opacity = "";
      if (light.current) light.current.style.opacity = "0";
      return;
    }
    phase.current = "exposing";
    expose(progress, false);
  };

  const going = (time: number) => {
    if (out === undefined || reduced || time < 0) return;
    if (phase.current !== "burnt") {
      glinting.current?.stop();
      glinting.current = null;
      if (phase.current === "dark") return;
      phase.current = "burnt";
    }
    const progress = unit((time - out) / GRAMMAR.exit.run);
    if (progress <= 0) {
      const p = print.current;
      if (p) clearMask(p);
      return;
    }
    expose(progress, true);
  };

  useMotionValueEvent(clock ?? still, "change", coming);
  useMotionValueEvent(exit ?? still, "change", going);

  useEffect(() => {
    if (clock) coming(clock.get());
    else printed();
  }, [text]);

  useEffect(() => {
    const element = print.current;
    if (!hover || reduced || !element) return;
    const host = element.parentElement;
    if (!host) return;

    // A second look: the light passes over the words again without
    // printing them anew.
    const glint = () => {
      const l = light.current;
      if (phase.current !== "printed" || glinting.current || !l) return;
      glinting.current = animate(0, 1, {
        duration: GRAMMAR.facts.replay,
        ease: "linear",
        onComplete: () => {
          glinting.current = null;
          l.style.opacity = "0";
        },
        onUpdate: (progress) =>
          shine(l, edgeAt(progress), Math.sin(Math.PI * progress) * GLINT),
      });
    };
    host.addEventListener("pointerenter", glint);
    return () => {
      host.removeEventListener("pointerenter", glint);
      glinting.current?.stop();
      glinting.current = null;
      if (light.current) light.current.style.opacity = "0";
    };
  }, [hover, reduced]);

  useEffect(() => {
    if (!exit) return;
    return exit.on("change", (time) => {
      if (time >= 0 || phase.current !== "burnt") return;
      printed();
    });
  }, [exit]);

  return (
    <Tag className={cn("relative", as === "span" && "inline-block", className)}>
      <span className="opacity-0" ref={print}>
        {text}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 select-none"
        ref={light}
        style={{ color: LIGHT, textShadow: HALATION }}
      >
        {text}
      </span>
    </Tag>
  );
}

export function Count({
  at,
  format,
  hover = false,
  run = GRAMMAR.count.run,
  value,
}: {
  at: number;
  format: (value: number) => string;
  hover?: boolean;
  run?: number;
  value: number;
}) {
  const reduced = useReducedMotion();
  const progress = useProgress(sinceBase(at), run);
  const replay = useMotionValue(1);
  const text = useTransform([progress, replay], ([p, r]: number[]) =>
    format(Math.round(value * Math.min(p, ease.expo(r)))),
  );
  const play = () => {
    if (reduced || progress.get() < 1 || replay.get() < 1) return;
    replay.set(0);
    animate(replay, 1, { duration: GRAMMAR.count.replay, ease: "linear" });
  };

  return (
    <motion.span onPointerEnter={hover ? play : undefined}>{text}</motion.span>
  );
}
