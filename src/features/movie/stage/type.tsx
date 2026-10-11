"use client";

import { useContext, useEffect, useRef, type ElementType } from "react";
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
import { SCENE, sinceBase, undoGap } from "../lib/motion";
import { focus, settle, spread, wordCount } from "../lib/tempo";
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
  const entered = useProgress(at, SCENE.title.run);
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
  const { title: cue } = SCENE;
  const start = sinceBase(cue.at);
  const gap = undoGap(words.length);
  const last = start + settle(words.length - 1, words.length, cue.window);
  const color = useInk(last + cue.run * 0.5, 1);

  return (
    <motion.h1
      aria-label={title}
      className={className}
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
  run,
}: {
  at: number;
  children: string;
  ink: string;
  out: number;
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
      style={{ color: ink, filter, opacity, transform }}
    >
      {children}
    </motion.span>
  );
}

export function Words({
  alpha = 0.7,
  at,
  cap,
  children: text,
  className,
  run,
  window,
}: {
  alpha?: number;
  at: number;
  cap: number;
  children: string;
  className?: string;
  run: number;
  window: number;
}) {
  const tokens = text.split(/(\s+)/);
  const count = wordCount(text);
  const gap = spread(count, window, cap);
  const out = undoGap(count);
  const start = sinceBase(at);
  const color = useInk(start + Math.max(count - 1, 0) * gap + run * 0.5, alpha);
  const ink = `rgb(252 252 251 / ${alpha})`;
  let index = 0;

  return (
    <motion.p className={className} style={{ color }}>
      <span className="sr-only">{text}</span>
      {tokens.map((token, position) => {
        if (!token) return null;
        if (/^\s+$/.test(token)) return token;
        const order = index++;
        return (
          <Word
            at={start + order * gap}
            ink={ink}
            key={position}
            out={order * out}
            run={run}
          >
            {token}
          </Word>
        );
      })}
    </motion.p>
  );
}

const GLYPHS = {
  digit: "0123456789",
  letter: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};
const GLYPH_HOLD = [34, 92] as const;
const GLYPH_LIFE = 0.42;
const GLYPH_SCATTER = 0.14;
const GLYPH_DIM = 0.3;
const GLYPH_BRIGHT = 0.9;

const hold = () =>
  GLYPH_HOLD[0] + Math.random() * (GLYPH_HOLD[1] - GLYPH_HOLD[0]);

function glyphFor(char: string, last?: string): string | null {
  const pool = /\d/.test(char)
    ? GLYPHS.digit
    : char.toLowerCase() !== char.toUpperCase()
      ? GLYPHS.letter
      : null;
  if (!pool) return null;
  const same = char.toUpperCase();
  let next = pool[Math.floor(Math.random() * pool.length)];
  for (let tries = 0; tries < 4 && (next === same || next === last); tries++) {
    next = pool[Math.floor(Math.random() * pool.length)];
  }
  return next;
}

interface Cell {
  char: string;
  element: HTMLSpanElement;
  fixed: boolean;
  from: number;
  glyph?: string;
  swapAt: number;
  to: number;
}

function typeset(node: Node, glyphs: HTMLElement, text: string): Cell[] {
  const origin = glyphs.getBoundingClientRect();
  const range = document.createRange();
  const cells: Cell[] = [];
  const letters = [...text].filter((char) => !/\s/.test(char)).length;
  let at = 0;
  let order = 0;
  for (const char of text) {
    const index = at;
    at += char.length;
    if (/\s/.test(char)) continue;
    range.setStart(node, index);
    range.setEnd(node, index + char.length);
    const box = range.getClientRects()[0];
    if (!box) continue;
    const element = document.createElement("span");
    element.textContent = char;
    Object.assign(element.style, {
      height: `${box.height}px`,
      left: `${box.left - origin.left}px`,
      lineHeight: `${box.height}px`,
      opacity: "0",
      position: "absolute",
      textAlign: "center",
      top: `${box.top - origin.top}px`,
      width: `${box.width}px`,
    });
    const span = 1 - GLYPH_LIFE;
    const lead = (order / Math.max(letters - 1, 1)) * span;
    const from = Math.min(
      span,
      Math.max(0, lead + (Math.random() - 0.5) * GLYPH_SCATTER),
    );
    cells.push({
      char,
      element,
      fixed: glyphFor(char) === null,
      from,
      swapAt: 0,
      to: Math.min(1, from + GLYPH_LIFE * (0.85 + Math.random() * 0.3)),
    });
    order += 1;
  }
  glyphs.replaceChildren(...cells.map((cell) => cell.element));
  return cells;
}

function paint(cells: Cell[], progress: number, unmake: boolean, now: number) {
  for (const cell of cells) {
    const { element } = cell;
    if (progress < cell.from) {
      if (unmake) {
        element.textContent = cell.char;
        element.style.opacity = "1";
      }
      continue;
    }
    if (cell.fixed || progress >= cell.to) {
      element.textContent = cell.char;
      element.style.opacity = unmake ? "0" : "1";
      continue;
    }
    if (now >= cell.swapAt) {
      cell.glyph = glyphFor(cell.char, cell.glyph) ?? cell.char;
      element.textContent = cell.glyph;
      cell.swapAt = now + hold();
    }
    const near = (progress - cell.from) / (cell.to - cell.from);
    const level = unmake
      ? GLYPH_BRIGHT - (GLYPH_BRIGHT - GLYPH_DIM) * near
      : GLYPH_DIM + (GLYPH_BRIGHT - GLYPH_DIM) * near;
    element.style.opacity = level.toFixed(2);
  }
}

export function Decode({
  as = "span",
  at = 0,
  children: text,
  className,
  hover = false,
  out,
  run: duration = SCENE.facts.decode,
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
  const real = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLSpanElement>(null);
  const cells = useRef<Cell[] | null>(null);
  const settled = useRef(false);
  const unmaking = useRef(false);
  const replaying = useRef<ReturnType<typeof animate> | null>(null);
  const still = useMotionValue(-1);
  const Tag = as as ElementType;
  const start = since ?? sinceBase(at);
  const run = SCENE.exit.run;

  const lay = () => {
    const word = real.current;
    const glyphs = layer.current;
    const node = word?.firstChild;
    if (!word || !glyphs || !node || node.nodeType !== Node.TEXT_NODE) {
      return null;
    }
    cells.current ??= typeset(node, glyphs, text);
    return cells.current;
  };

  const draw = (progress: number, unmake: boolean) => {
    const laid = lay();
    if (laid) paint(laid, progress, unmake, performance.now());
  };

  const coming = (time: number) => {
    const word = real.current;
    const glyphs = layer.current;
    if (!word || !glyphs || replaying.current) return;
    const progress = unit((time - start) / duration);
    if (reduced || progress >= 1) {
      if (!settled.current) {
        settled.current = true;
        word.style.color = "inherit";
        glyphs.replaceChildren();
        cells.current = null;
      }
      return;
    }
    settled.current = false;
    if (progress <= 0) {
      word.style.color = "";
      return;
    }
    draw(progress, false);
  };

  const going = (time: number) => {
    const word = real.current;
    if (!word || out === undefined || reduced || time < 0) return;
    if (!unmaking.current) {
      replaying.current?.stop();
      replaying.current = null;
      unmaking.current = true;
      cells.current = null;
      word.style.color = "transparent";
    }
    draw(unit((time - out) / run), true);
  };

  useMotionValueEvent(clock ?? still, "change", coming);
  useMotionValueEvent(exit ?? still, "change", going);

  useEffect(() => {
    if (clock) coming(clock.get());
  }, [text]);

  useEffect(() => {
    const word = real.current;
    if (!hover || reduced || !word) return;
    const host = word.parentElement;
    if (!host) return;

    const settle = () => {
      replaying.current = null;
      settled.current = true;
      word.style.color = "inherit";
      layer.current?.replaceChildren();
      cells.current = null;
    };
    const play = () => {
      if (!settled.current || replaying.current || unmaking.current) return;
      settled.current = false;
      cells.current = null;
      word.style.color = "transparent";
      replaying.current = animate(0, 1, {
        duration: SCENE.facts.replay,
        ease: "linear",
        onComplete: settle,
        onUpdate: (progress) => draw(progress, false),
      });
    };
    host.addEventListener("pointerenter", play);
    return () => {
      host.removeEventListener("pointerenter", play);
      if (replaying.current) {
        replaying.current.stop();
        settle();
      }
    };
  }, [hover, reduced]);

  useEffect(() => {
    if (!exit) return;
    return exit.on("change", (time) => {
      if (time >= 0 || !unmaking.current) return;
      unmaking.current = false;
      const word = real.current;
      if (!word) return;
      word.style.color = "inherit";
      layer.current?.replaceChildren();
      cells.current = null;
    });
  }, [exit]);

  return (
    <Tag className={cn("relative", as === "span" && "inline-block", className)}>
      <span className="text-transparent" ref={real}>
        {text}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none"
        ref={layer}
      />
    </Tag>
  );
}

export function Count({
  at,
  format,
  hover = false,
  value,
}: {
  at: number;
  format: (value: number) => string;
  hover?: boolean;
  value: number;
}) {
  const reduced = useReducedMotion();
  const progress = useProgress(sinceBase(at), SCENE.count.run);
  const replay = useMotionValue(1);
  const text = useTransform([progress, replay], ([p, r]: number[]) =>
    format(Math.round(value * Math.min(p, ease.expo(r)))),
  );
  const play = () => {
    if (reduced || progress.get() < 1 || replay.get() < 1) return;
    replay.set(0);
    animate(replay, 1, { duration: SCENE.count.replay, ease: "linear" });
  };

  return (
    <motion.span onPointerEnter={hover ? play : undefined}>{text}</motion.span>
  );
}
