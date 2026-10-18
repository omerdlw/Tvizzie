"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type MouseEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { preload } from "react-dom";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import { movieHref } from "@config/routes";
import { layoutTop } from "@/motion/flow";
import { readable } from "@/motion/film/gl";
import { useScrollY, useSmoothScroll } from "@/motion/scroll";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { bounds, point } from "../lib/cursor";
import { formatWeek, rankLabel } from "../lib/format";
import { rasterWord, type WordRaster } from "../lib/glyphs";
import { layScreen, layWord, type Rect, type WordLayout } from "../lib/layout";
import {
  LENGTH,
  OPENED,
  REST,
  SLICE_GAP,
  planTiles,
  sceneAt,
  shareBand,
} from "../lib/shatter";
import { ShatterRenderer } from "../lib/shatter-renderer";
import { useStop } from "../lib/stop";
import type { HomeFeed, TrendingMovie } from "../lib/types";
import { FilmDock } from "./film-dock";
import { Drum } from "./odometer";
import { ScrollCue } from "./scroll-cue";

const WORD = "TVIZZIE";
const FILM_FADE_MS = 900;
// The tiles do not come in until the films are there to show on them, or
// this long after the type is ready, whichever comes first.
const STRIKE_WAIT_MS = 1200;
// Scrolling before the word is up hurries it along.
const STRIKE_HURRY = 4;
// Once every tile has locked in, the word stands still.
const STRUCK_S = 3.6;
// The home page glides heavier than the rest of the site, and never faster
// than its scenes can be seen at.
const FEEL = {
  lead: 0.9,
  maxSpeed: 2.2,
  response: 0.24,
  wheelMultiplier: 0.55,
} as const;
// After the scroll has been still this long, a camera caught mid-flight is
// carried gently on the way the scroll was going: on to the band or back to
// the word, on into the corridor or back to the band. A notch of the wheel
// is enough to start a scene, and never undoes itself.
const DETENT_MS = 320;
const DETENT_S = 1.4;
// The film in focus is shot as the film page's hero is, with its tuning: the
// camera has weight and settles with a little overshoot; the lens follows
// the cursor a beat behind and lets go when the hand has been still a while;
// the shutter's exposure as the camera turns, and the shorter one the light
// under the cursor is caught over, drawn out no further than a share of the
// band's height.
const HERO = {
  camera: { damping: 8.6, stiffness: 48 },
  exposure: 0.42,
  exposureMax: 1.3,
  halation: 0.55,
  lens: { damping: 21.5, stiffness: 160 },
  lensExposure: 0.12,
  linger: 4000,
  trailMax: 0.32,
} as const;
// The sampling copy of the word, across, in pixels.
const SAMPLE_WIDTH = 1400;

const MONO = "font-mono text-[10px] uppercase tracking-[0.24em] sm:text-[11px]";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (value: number, a: number, b: number) =>
  smooth(clamp((value - a) / (b - a), 0, 1));
const follow = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));

// Springs are named by how they feel: stiffness sets the pace, the damping
// ratio the character (1 never overshoots).
interface Spring {
  v: number;
  x: number;
}
interface Tune {
  damping: number;
  stiffness: number;
}
const tune = (stiffness: number, ratio: number): Tune => ({
  damping: 2 * ratio * Math.sqrt(stiffness),
  stiffness,
});
// A slice opening out, slow and creamy, never past where it is going.
const OPENING = tune(60, 1);
const LIGHTING = tune(90, 1);
// The light and the camera passing from one film to the next, unhurried.
const RACKING = tune(42, 1);
const STEP = 1 / 240;
const pull = (s: Spring, to: number, dt: number, t: Tune) => {
  s.v += ((to - s.x) * t.stiffness - s.v * t.damping) * dt;
  s.x += s.v * dt;
};
const resting = (s: Spring, to: number) =>
  Math.abs(s.v) < 1e-3 && Math.abs(s.x - to) < 1e-3;

interface Mass {
  vx: number;
  vy: number;
  x: number;
  y: number;
}
const drag = (
  mass: Mass,
  tx: number,
  ty: number,
  dt: number,
  { damping, stiffness }: { damping: number; stiffness: number },
) => {
  mass.vx += ((tx - mass.x) * stiffness - mass.vx * damping) * dt;
  mass.vy += ((ty - mass.y) * stiffness - mass.vy * damping) * dt;
  mass.x += mass.vx * dt;
  mass.y += mass.vy * dt;
};

// How far the light under the cursor is drawn out behind it while the hand
// moves, in device pixels.
function trailOf(lens: Mass, reach: number, dpr: number): [number, number] {
  const x = lens.vx * HERO.lensExposure;
  const y = lens.vy * HERO.lensExposure;
  const length = Math.hypot(x, y);
  const most = HERO.trailMax * reach;
  const keep = length > most ? most / length : 1;
  return [x * keep * dpr, y * keep * dpr];
}

const backdropOf = (film: TrendingMovie) =>
  tmdbImageUrl("backdrop", film.backdropPath, "w1280") ?? undefined;

export interface OpeningProps {
  films: HomeFeed["trending"];
  week: HomeFeed["week"];
}

export function Opening({ films, week }: OpeningProps): JSX.Element {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const heroLayer = useRef<HTMLDivElement>(null);
  const copyLayer = useRef<HTMLDivElement>(null);
  const ranks = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const [inside, setInside] = useState(false);
  const [plain, setPlain] = useState(false);
  const [generation, setGeneration] = useState(0);
  // The film chosen, for the frame loop.
  const chosen = useRef(0);
  // The pointer over the stage, in CSS pixels, while a mouse is on it.
  const aim = useRef<{ x: number; y: number } | null>(null);
  // The slices as they are going to be, in CSS pixels, for finding the one
  // under the pointer without it moving away beneath it.
  const targets = useRef<Rect[]>([]);
  const open = useRef(false);
  const scrollY = useScrollY();
  const engine = useSmoothScroll();
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());
  // A flick from the word comes to rest on the band, whole.
  useStop(section, REST + 0.02);

  const lead = films[0] ? backdropOf(films[0]) : undefined;
  if (lead) {
    preload(readable(lead), {
      as: "image",
      crossOrigin: "anonymous",
      fetchPriority: "high",
    });
  }

  useEffect(() => {
    if (!engine) return;
    return engine.tune(FEEL);
  }, [engine]);

  const choose = useCallback(
    (index: number) => {
      if (index < 0 || index >= films.length) return;
      if (index === chosen.current) return;
      chosen.current = index;
      setActive(index);
    },
    [films.length],
  );

  useEffect(() => {
    const sectionEl = section.current;
    const stageEl = stage.current;
    const canvasEl = canvas.current;
    if (!sectionEl || !stageEl || !canvasEl || films.length === 0) return;

    const count = Math.min(10, films.length);
    let dpr = 1;
    let vw = 1;
    let vh = 1;
    let top = 0;
    let band: Rect = { height: 1, left: 0, top: 0, width: 1 };
    let portrait = false;
    let word: WordRaster | null = null;
    let wordAt = 0;
    let wordLayout: WordLayout | null = null;
    let visible = true;
    let cancelled = false;
    let dirty = true;
    let lastInside = false;
    let lastY = Number.NaN;
    let stillSince = performance.now();
    let carried = false;
    // Which way the scroll last went: 1 down the page, -1 back up it.
    let heading = 1;
    let lastAt = performance.now();
    // Seconds into the tiles coming in, once they have begun.
    let struck = -1;
    let lastPointer = "";
    let movedAt = 0;
    const camera: Mass = { vx: 0, vy: 0, x: 0, y: 0 };
    const lens: Mass = { vx: 0, vy: 0, x: 0, y: 0 };
    let lensSeen = false;
    let shutter: [number, number] = [0, 0];
    let rack = 0;
    let glowFrom = 0;
    let glowTo = 0;
    let owed = 0;

    const weights = Array.from({ length: count }, (_, i) => ({
      v: 0,
      x: i === 0 ? OPENED : 1,
    }));
    const lit = Array.from({ length: count }, (_, i) => ({
      v: 0,
      x: i === 0 ? 1 : 0,
    }));
    const glow = { v: 0, x: 1 };
    const starts = new Float32Array(10);
    const sizes = new Float32Array(10);
    const deviceStarts = new Float32Array(10);
    const deviceSizes = new Float32Array(10);
    const litValues = new Float32Array(10);
    const targetStarts = new Float32Array(10);
    const targetSizes = new Float32Array(10);

    const renderer = ShatterRenderer.create(
      canvasEl,
      films.slice(0, count).map(backdropOf),
    );
    if (!renderer) setPlain(true);

    const family =
      getComputedStyle(document.body).getPropertyValue("--font-zuume").trim() ||
      "sans-serif";

    const sliceRect = (
      i: number,
      from: Float32Array,
      span: Float32Array,
    ): Rect =>
      portrait
        ? {
            height: span[i]!,
            left: band.left,
            top: band.top + from[i]!,
            width: band.width,
          }
        : {
            height: band.height,
            left: band.left + from[i]!,
            top: band.top,
            width: span[i]!,
          };

    const measure = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vw = stageEl.clientWidth;
      vh = stageEl.clientHeight;
      top = layoutTop(sectionEl);
      const width = Math.max(1, Math.round(vw * dpr));
      const height = Math.max(1, Math.round(vh * dpr));
      if (canvasEl.width !== width) canvasEl.width = width;
      if (canvasEl.height !== height) canvasEl.height = height;

      portrait = vw < 768 && vh > vw;
      band = layScreen(vw, vh);
      const set = (name: string, value: number) =>
        stageEl.style.setProperty(name, `${value}px`);
      set("--band-left", band.left);
      set("--band-right", vw - band.left - band.width);
      set("--band-top", band.top);
      set("--band-bottom", vh - band.top - band.height);
      if (word) {
        wordLayout = layWord(word, vw, vh, dpr);
        set("--word-bottom", vh - wordLayout.ink.bottom);
      }
      dirty = true;
    };

    void document.fonts
      .load(`700 100px ${family}`)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        const limit = renderer?.maxTexture ?? 4096;
        const longest = Math.max(window.screen.width, window.screen.height);
        word = rasterWord(
          WORD,
          family,
          Math.min(
            limit,
            4096,
            Math.max(1024, Math.round(longest * dpr * 1.25)),
          ),
        );
        if (renderer) {
          renderer.setWord(word);
          renderer.setTiles(
            planTiles(rasterWord(WORD, family, SAMPLE_WIDTH), count),
          );
        }
        wordAt = performance.now();
        measure();
      });

    const observer = new ResizeObserver(measure);
    observer.observe(stageEl);
    observer.observe(document.body);
    const seen = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      dirty = true;
    });
    seen.observe(sectionEl);
    measure();

    const show = (element: HTMLElement | null, value: number) => {
      if (!element) return;
      element.style.opacity = String(value);
      element.style.visibility = value > 0.001 ? "visible" : "hidden";
    };
    const rankEls = Array.from(ranks.current?.children ?? []) as HTMLElement[];

    const step = () => {
      const now = performance.now();
      const dt = clamp(now - lastAt, 1, 64) / 1000;
      lastAt = now;
      const y = scrollY.get();
      const s = clamp((y - top) / vh, 0, LENGTH);
      const scene = sceneAt(s);
      const on = chosen.current;

      if (y !== lastY) {
        if (!Number.isNaN(lastY) && !carried) heading = Math.sign(y - lastY);
        lastY = y;
        stillSince = now;
        carried = false;
        dirty = true;
      } else if (
        engine &&
        !reduced &&
        !carried &&
        now - stillSince > DETENT_MS
      ) {
        carried = true;
        // Into the corridor the tunnel takes over, and rests itself.
        const to =
          scene.travel > 0.001 && scene.travel < 0.999
            ? heading > 0
              ? REST + 0.02
              : 0
            : scene.outro > 0.001 && scene.outro < 0.999
              ? heading > 0
                ? LENGTH
                : REST + 0.02
              : null;
        if (to !== null) engine.scrollTo(top + to * vh, { duration: DETENT_S });
      }

      // Under the burst is the corridor; once the band is past, the stage
      // gives the screen up to it.
      stageEl.style.visibility = s < LENGTH - 0.002 ? "visible" : "hidden";
      stageEl.style.pointerEvents = scene.outro > 0.1 ? "none" : "";
      show(heroLayer.current, scene.hero);
      show(copyLayer.current, scene.copy);
      open.current = scene.copy > 0.6;
      const within = lastInside ? scene.copy > 0.3 : scene.copy > 0.7;
      if (within !== lastInside) {
        lastInside = within;
        setInside(within);
      }

      // The slices open and light towards the film chosen.
      let moving = false;
      if (reduced) {
        weights.forEach((w, i) => ((w.x = i === on ? OPENED : 1), (w.v = 0)));
        lit.forEach((l, i) => ((l.x = i === on ? 1 : 0), (l.v = 0)));
      } else {
        owed += dt;
        while (owed >= STEP) {
          owed -= STEP;
          for (let i = 0; i < count; i++) {
            pull(weights[i]!, i === on ? OPENED : 1, STEP, OPENING);
            pull(lit[i]!, i === on ? 1 : 0, STEP, RACKING);
          }
          pull(glow, 1, STEP, LIGHTING);
        }
        for (let i = 0; i < count; i++) {
          if (
            !resting(weights[i]!, i === on ? OPENED : 1) ||
            !resting(lit[i]!, i === on ? 1 : 0)
          ) {
            moving = true;
          }
        }
        if (!resting(glow, 1)) moving = true;
      }
      if (glowTo !== on) {
        glowFrom = glowTo;
        glowTo = on;
        glow.x = reduced ? 1 : 0;
        glow.v = 0;
      }

      const along = portrait ? band.height : band.width;
      shareBand(
        weights.map((w) => w.x),
        along,
        SLICE_GAP,
        starts,
        sizes,
      );
      shareBand(
        weights.map((_, i) => (i === on ? OPENED : 1)),
        along,
        SLICE_GAP,
        targetStarts,
        targetSizes,
      );
      targets.current = weights.map((_, i) =>
        sliceRect(i, targetStarts, targetSizes),
      );

      // The ranks ride under their slices.
      if (!portrait) {
        rankEls.forEach((el, i) => {
          const x = starts[i]! + sizes[i]! / 2;
          el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) translateX(-50%)`;
        });
      }

      // The pointer over the band: the house cursor frames the slice under
      // it, and the film in focus takes the hero's camera and lens.
      const pointer = aim.current;
      const hovered =
        pointer && open.current
          ? targets.current.findIndex(
              (box) =>
                pointer.x >= box.left &&
                pointer.x <= box.left + box.width &&
                pointer.y >= box.top &&
                pointer.y <= box.top + box.height,
            )
          : -1;
      const film = films[hovered];
      if (film) {
        const box = sliceRect(hovered, starts, sizes);
        point(canvasEl, {
          box: bounds([
            { x: box.left, y: box.top },
            { x: box.left + box.width, y: box.top + box.height },
          ]),
          corner: 3,
          title: film.title,
          year: film.year,
        });
      } else {
        point(canvasEl, null);
      }
      const pointerKey = pointer ? `${pointer.x},${pointer.y}` : "";
      if (pointerKey !== lastPointer) {
        lastPointer = pointerKey;
        movedAt = now;
        dirty = true;
      }

      // The film in focus, shot as the film page's hero is. The camera leans
      // after the hand over it, and comes back when the hand leaves.
      if (!reduced) {
        const hand = Math.min(dt, 1 / 30);
        let tx = 0;
        let ty = 0;
        if (hovered === on && pointer) {
          const box = sliceRect(on, starts, sizes);
          tx = ((pointer.x - box.left) / box.width) * 2 - 1;
          ty = ((pointer.y - box.top) / box.height) * 2 - 1;
        }
        drag(camera, tx, ty, hand, HERO.camera);
        const swing = Math.abs(camera.vx) + Math.abs(camera.vy);
        const next: [number, number] = [
          clamp(camera.vx * HERO.exposure, -HERO.exposureMax, HERO.exposureMax),
          clamp(camera.vy * HERO.exposure, -HERO.exposureMax, HERO.exposureMax),
        ];
        shutter = Math.abs(next[0]) + Math.abs(next[1]) < 0.015 ? [0, 0] : next;
        if (
          swing > 1e-3 ||
          Math.abs(camera.x - tx) + Math.abs(camera.y - ty) > 1e-4
        ) {
          moving = true;
        }

        // The focus puller follows the cursor a beat behind, holds while it
        // moves, and lets go when the hand has been still a while.
        if (pointer && !lensSeen) {
          lens.x = pointer.x;
          lens.y = pointer.y;
          lensSeen = true;
        }
        if (pointer) drag(lens, pointer.x, pointer.y, hand, HERO.lens);
        if (Math.abs(lens.vx) + Math.abs(lens.vy) > 0.05) moving = true;
        const alive =
          hovered >= 0 && scene.copy > 0.5 && now - movedAt < HERO.linger;
        const nextRack =
          rack +
          ((alive ? 1 : 0) - rack) * (1 - Math.exp(-hand * (alive ? 5 : 1.6)));
        if (Math.abs(nextRack - rack) > 5e-4) moving = true;
        rack = nextRack < 0.002 && !alive ? 0 : nextRack;
      }

      if (!renderer || !visible || cancelled || !wordLayout) return;

      if (renderer.pump()) dirty = true;
      if (renderer.light(now, reduced ? 1 : FILM_FADE_MS)) dirty = true;

      if (
        struck < 0 &&
        (renderer.settled ||
          Array.from({ length: Math.min(7, count) }, (_, i) => i).every((i) =>
            renderer.ready(i),
          ) ||
          now - wordAt > STRIKE_WAIT_MS)
      ) {
        struck = 0;
      }
      if (struck >= 0 && struck < STRUCK_S) {
        struck += dt * (s > 0.02 ? STRIKE_HURRY : 1);
        dirty = true;
      }
      if (moving) dirty = true;
      if (!dirty) return;
      dirty = false;

      for (let i = 0; i < count; i++) {
        deviceStarts[i] = starts[i]! * dpr;
        deviceSizes[i] = sizes[i]! * dpr;
        litValues[i] = clamp(lit[i]!.x, 0, 1);
      }
      // Two cameras. One flies into the I, the letter's middle drawn to the
      // middle of the frame as it comes; the other is on the band, from so
      // close in to the film in focus that it fills the frame, and it is the
      // one the I looks through. Where the I fills the frame the tiles land
      // and the second camera pulls back out of the band.
      const landed = reduced ? scene.travel >= 0.5 : scene.landed;
      const deep = reduced ? 0 : scene.zoom;
      const settle = reduced ? 1 : scene.settle;
      const cx = (vw * dpr) / 2;
      const cy = (vh * dpr) / 2;
      const [fx, fy] = wordLayout.focal;
      const wordZoom = Math.exp(Math.log(wordLayout.zoom) * deep);
      const shift = clamp(deep / 0.7, 0, 1);
      const target = sliceRect(on, starts, sizes);
      const tw = Math.max(1, target.width * dpr);
      const th = Math.max(1, target.height * dpr);
      const tx = target.left * dpr + tw / 2;
      const ty = target.top * dpr + th / 2;
      const close = Math.max((vw * dpr) / tw, (vh * dpr) / th);
      const bandZoom = landed
        ? Math.exp(Math.log(close * 1.07) * (1 - settle))
        : close * (1 + 0.07 * deep);
      const pulled = landed ? settle : 0;
      const inner = {
        look: [
          tx - ((tx - cx) * pulled) / bandZoom,
          ty - ((ty - cy) * pulled) / bandZoom,
        ] as const,
        zoom: bandZoom,
      };
      const view = landed
        ? inner
        : {
            look: [
              fx - ((fx - cx) * (1 - shift)) / wordZoom,
              fy - ((fy - cy) * (1 - shift)) / wordZoom,
            ] as const,
            zoom: wordZoom,
          };
      const glowing = landed
        ? ramp(settle, 0.2, 1) * (1 - ramp(scene.outro, 0, 0.5))
        : 0;
      renderer.draw({
        axis: portrait ? 1 : 0,
        backdrop: scene.backdrop,
        band: [
          band.left * dpr,
          band.top * dpr,
          band.width * dpr,
          band.height * dpr,
        ],
        calm: reduced ? 1 : 0,
        deep,
        distance: Math.max(vw, vh) * dpr * 1.1,
        exposure: scene.exposure,
        glow: {
          // The band as the camera on it sees it.
          band: [
            cx + (band.left * dpr - inner.look[0]) * bandZoom,
            cy + (band.top * dpr - inner.look[1]) * bandZoom,
            band.width * dpr * bandZoom,
            band.height * dpr * bandZoom,
          ],
          blend: clamp(glow.x, 0, 1),
          layers: [glowFrom, glowTo],
          strength: glowing,
        },
        grain: reduced ? 0.04 : 0.08,
        hero: {
          camera: [clamp(camera.x, -1.15, 1.15), clamp(camera.y, -1.15, 1.15)],
          halation: HERO.halation,
          lens: [lens.x * dpr, lens.y * dpr],
          rack,
          shutter,
          trail: trailOf(lens, band.height, dpr),
        },
        inner,
        intro: reduced ? 10 : Math.max(0, struck),
        landed,
        lit: litValues,
        outro: scene.outro,
        px: dpr,
        sizes: deviceSizes,
        starts: deviceStarts,
        through: {
          index: on,
          rect: [target.left * dpr, target.top * dpr, tw, th],
        },
        time: reduced ? 0 : now / 1000,
        view,
        word: wordLayout.box,
      });
    };

    frame.render(step, true);
    void renderer?.lost.then(() => {
      cancelled = true;
      cancelFrame(step);
    });
    const restore = () => setGeneration((value) => value + 1);
    canvasEl.addEventListener("webglcontextrestored", restore);

    return () => {
      cancelled = true;
      cancelFrame(step);
      observer.disconnect();
      seen.disconnect();
      point(canvasEl, null);
      canvasEl.removeEventListener("webglcontextrestored", restore);
      renderer?.dispose();
    };
  }, [engine, films, generation, reduced, scrollY]);

  const under = (x: number, y: number) =>
    targets.current.findIndex(
      (box) =>
        x >= box.left &&
        x <= box.left + box.width &&
        y >= box.top &&
        y <= box.top + box.height,
    );

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const at = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    aim.current = at;
    if (!open.current) return;
    const index = under(at.x, at.y);
    if (index >= 0) choose(index);
  };

  const leave = () => {
    aim.current = null;
  };

  // A tap opens a slice out; on the one already open, it goes to the film.
  const press = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!open.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const at = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const index = under(at.x, at.y);
    const film = films[index];
    if (!film) return;
    if (index === chosen.current) router.push(movieHref(film.id));
    else choose(index);
  };

  const current = films[active] ?? films[0];

  return (
    <section
      ref={section}
      aria-label="Trending this week"
      className="relative"
      style={{ height: `${(LENGTH + 1) * 100}svh` }}
    >
      <div
        ref={stage}
        className="sticky top-0 z-20 h-svh w-full overflow-hidden"
      >
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 block size-full"
          onClick={press}
          onPointerLeave={leave}
          onPointerMove={move}
        />

        <div ref={heroLayer} className="pointer-events-none absolute inset-0">
          <h1
            className={
              plain
                ? "absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-zuume text-[min(36vw,58svh)] leading-none text-white"
                : "sr-only"
            }
          >
            Tvizzie
          </h1>
          <ScrollCue />
        </div>

        {films.length > 0 && (
          <div
            ref={copyLayer}
            className="pointer-events-none invisible absolute inset-0 opacity-0"
          >
            {plain ? (
              <PlainBand active={active} films={films} onChoose={choose} />
            ) : null}
            <Header active={active} count={films.length} week={week} />
            <ol
              ref={ranks}
              aria-hidden
              className={`absolute hidden h-4 sm:block ${MONO}`}
              style={{
                left: "var(--band-left)",
                right: "var(--band-right)",
                top: "calc(100% - var(--band-bottom) + clamp(0.9rem, 2.4svh, 1.4rem))",
              }}
            >
              {films.map((film, index) => (
                <li
                  key={film.id}
                  className={`absolute top-0 left-0 tabular-nums transition-colors duration-slow ease-out-cream ${
                    index === active ? "text-white/90" : "text-white/30"
                  }`}
                >
                  {rankLabel(index + 1)}
                </li>
              ))}
            </ol>
          </div>
        )}

        <nav aria-label="This week's films" className="sr-only">
          <ol>
            {films.map((film, index) => (
              <li key={film.id}>
                <Link href={movieHref(film.id)} onFocus={() => choose(index)}>
                  No. {index + 1}: {film.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {current ? <FilmDock film={current} shown={inside} /> : null}
    </section>
  );
}

// The line over the band: what it is, the week it covers, and which of the
// week's films is open.
function Header({
  active,
  count,
  week,
}: {
  active: number;
  count: number;
  week: HomeFeed["week"];
}): JSX.Element {
  const ranks = Array.from({ length: count }, (_, i) => rankLabel(i + 1));
  return (
    <header
      className={`absolute flex items-center gap-4 sm:gap-6 ${MONO}`}
      style={{
        bottom: "calc(100% - var(--band-top) + clamp(0.9rem, 2.4svh, 1.5rem))",
        left: "var(--band-left)",
        right: "var(--band-right)",
      }}
    >
      <h2 className="shrink-0 text-white/85">Trending this week</h2>
      <span className="hidden shrink-0 text-white/35 sm:inline">
        {formatWeek(week)}
      </span>
      <span aria-hidden className="h-px min-w-6 flex-1 bg-white/12" />
      <span className="flex shrink-0 items-center text-white/35 tabular-nums">
        <Drum
          align="end"
          className="-my-[0.12em] text-white/85"
          index={active}
          items={ranks}
        />
        <span className="whitespace-pre"> / </span>
        {rankLabel(count)}
      </span>
    </header>
  );
}

// Without WebGL the band is laid out plainly, the film chosen opened out.
function PlainBand({
  active,
  films,
  onChoose,
}: {
  active: number;
  films: TrendingMovie[];
  onChoose: (index: number) => void;
}): JSX.Element {
  return (
    <div
      className="pointer-events-auto absolute flex flex-col gap-1.5 sm:flex-row"
      style={{
        bottom: "var(--band-bottom)",
        left: "var(--band-left)",
        right: "var(--band-right)",
        top: "var(--band-top)",
      }}
    >
      {films.map((film, index) => (
        <Link
          key={film.id}
          aria-label={film.title}
          className="relative min-h-0 min-w-0 overflow-hidden rounded-[3px] transition-[flex-grow] duration-cinematic ease-out-cream"
          href={movieHref(film.id)}
          onFocus={() => onChoose(index)}
          onPointerEnter={() => onChoose(index)}
          style={
            {
              flexBasis: 0,
              flexGrow: index === active ? OPENED : 1,
            } as CSSProperties
          }
        >
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            decoding="async"
            src={
              tmdbImageUrl("backdrop", film.backdropPath, "w780") ?? undefined
            }
          />
        </Link>
      ))}
    </div>
  );
}
