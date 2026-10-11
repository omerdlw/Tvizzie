"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { preload } from "react-dom";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import { layoutTop } from "@/motion/flow";
import { readable } from "@/motion/film/gl";
import { pointerSample, watchPointer } from "@/motion/film/pointer";
import { useScrollY, useSmoothScroll } from "@/motion/scroll";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { rasterWord, type WordRaster } from "../lib/glyphs";
import { layScreen, layWord, type Rect, type WordLayout } from "../lib/layout";
import { OpeningRenderer } from "../lib/opening-renderer";
import { sceneAt, stillness, timelineLength } from "../lib/timeline";
import type { HomeFeed } from "../lib/types";
import { NowShowing } from "./now-showing";
import { ScrollCue } from "./scroll-cue";

const WORD = "TVIZZIE";
const LETTERS = WORD.length;
const HERO_FADE_MS = 1900;
const FILM_FADE_MS = 900;
// The home page glides heavier than the rest of the site.
const FEEL = { response: 0.24, wheelMultiplier: 0.55 } as const;
// After the scroll has been still this long, a film caught halfway through
// the glass is carried gently to the nearer side.
const DETENT_MS = 320;
const DETENT_S = 1.4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const outQuart = (t: number) => 1 - (1 - t) ** 4;
const outCubic = (t: number) => 1 - (1 - t) ** 3;
const follow = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const sourcesOf = (film: HomeFeed["trending"][number]) =>
  [
    tmdbImageUrl("backdrop", film.backdropPath, "w1280"),
    tmdbImageUrl("backdrop", film.backdropPath, "original"),
  ].filter((src): src is string => Boolean(src));

export interface OpeningProps {
  films: HomeFeed["trending"];
  week: HomeFeed["week"];
}

export function Opening({ films, week }: OpeningProps): JSX.Element {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const heroLayer = useRef<HTMLDivElement>(null);
  const showLayer = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState({ direction: 1, index: 0 });
  const [plain, setPlain] = useState(false);
  const [generation, setGeneration] = useState(0);
  const scrollY = useScrollY();
  const engine = useSmoothScroll();
  const reduced = Boolean(useReducedMotion());
  const length = timelineLength(films.length);

  const lead = films[0];
  const leadPreview = lead ? sourcesOf(lead)[0] : undefined;
  if (leadPreview) {
    preload(readable(leadPreview), {
      as: "image",
      crossOrigin: "anonymous",
      fetchPriority: "high",
    });
  }

  useEffect(() => {
    if (!engine) return;
    return engine.tune(FEEL);
  }, [engine]);

  useEffect(() => {
    const sectionEl = section.current;
    const stageEl = stage.current;
    const canvasEl = canvas.current;
    if (!sectionEl || !stageEl || !canvasEl) return;

    let dpr = 1;
    let vw = 1;
    let vh = 1;
    let top = 0;
    let word: WordRaster | null = null;
    let wordAt = 0;
    let wordLayout: WordLayout | null = null;
    let screen: Rect = { height: 1, left: 0, top: 0, width: 1 };
    let portrait = false;
    let visible = true;
    let cancelled = false;
    let lastActive = 0;
    let lastS = 0;
    let lastY = -1;
    let stillSince = performance.now();
    let carried = false;
    let lastAt = performance.now();
    let velocity = 0;
    const pointer = { x: 0, y: 0 };
    const started = performance.now();

    const renderer = OpeningRenderer.create(
      canvasEl,
      films.map(sourcesOf),
      (index) => Math.min(index === 0 ? 2560 : 2048, Math.max(vw, vh) * dpr),
    );
    if (!renderer) setPlain(true);

    const family =
      getComputedStyle(document.body).getPropertyValue("--font-zuume").trim() ||
      "sans-serif";

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
      screen = layScreen(vw, vh);
      const set = (name: string, value: number) =>
        stageEl.style.setProperty(name, `${value}px`);
      set("--screen-left", screen.left);
      set("--screen-right", vw - screen.left - screen.width);
      set("--screen-top", screen.top);
      set("--screen-bottom", vh - screen.top - screen.height);

      if (word) {
        wordLayout = layWord(word, vw, vh, dpr);
        set("--word-bottom", vh - wordLayout.ink.bottom);
      }
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
        renderer?.setWord(word);
        wordAt = performance.now();
        measure();
      });

    const stopPointer = watchPointer();
    const observer = new ResizeObserver(measure);
    observer.observe(stageEl);
    observer.observe(document.body);
    const seen = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    seen.observe(sectionEl);
    measure();

    const show = (element: HTMLElement | null, value: number) => {
      if (!element) return;
      element.style.opacity = String(value);
      element.style.visibility = value > 0.001 ? "visible" : "hidden";
    };

    const step = () => {
      const now = performance.now();
      const dt = clamp(now - lastAt, 1, 64) / 1000;
      lastAt = now;
      const y = scrollY.get();
      const s = clamp((y - top) / vh, 0, length);
      const scene = sceneAt(s, films.length);

      velocity = follow(velocity, clamp((s - lastS) / dt / 2, -1, 1), 8, dt);
      lastS = s;

      if (y !== lastY) {
        lastY = y;
        stillSince = now;
        carried = false;
      } else if (
        engine &&
        !reduced &&
        !carried &&
        now - stillSince > DETENT_MS &&
        scene.mix > 0.04 &&
        scene.mix < 0.96
      ) {
        carried = true;
        const target =
          scene.mix < 0.5
            ? stillness(scene.filmA)[1] - 0.02
            : stillness(scene.filmB)[0] + 0.02;
        engine.scrollTo(top + target * vh, { duration: DETENT_S });
      }

      show(heroLayer.current, scene.hero);
      show(showLayer.current, scene.copy);
      if (showLayer.current) {
        showLayer.current.style.pointerEvents =
          scene.copy > 0.6 ? "auto" : "none";
      }
      stageEl.style.setProperty("--progress", String(scene.progress));
      stageEl.style.setProperty("--settle", String(scene.copy));

      if (scene.active !== lastActive) {
        const direction = scene.active > lastActive ? 1 : -1;
        lastActive = scene.active;
        setActive({ direction, index: scene.active });
      }

      if (!renderer || !visible || cancelled || !wordLayout) return;

      const sample = pointerSample();
      const present = sample.present && !reduced;
      pointer.x = follow(
        pointer.x,
        present ? (sample.x / vw) * 2 - 1 : 0,
        2.6,
        dt,
      );
      pointer.y = follow(
        pointer.y,
        present ? (sample.y / vh) * 2 - 1 : 0,
        2.6,
        dt,
      );

      renderer.keep([scene.filmA, scene.filmB]);

      const since = (now - wordAt) / 1000;
      const rise = Array.from({ length: LETTERS }, (_, i) =>
        reduced ? 1 : outQuart(clamp((since - 0.2 - i * 0.09) / 1.3, 0, 1)),
      );

      const heroLight = renderer.light(0, now, reduced ? 1 : HERO_FADE_MS);
      const flicker =
        heroLight < 1 && !reduced
          ? 0.82 +
            0.18 * Math.abs(Math.sin(now * 0.031) * Math.sin(now * 0.017))
          : 1;
      const lightOf = (index: number) =>
        index === 0 && scene.mode === 0
          ? outCubic(heroLight) * flicker
          : outCubic(renderer.light(index, now, FILM_FADE_MS));

      const arrival = renderer.ready(0)
        ? outCubic(clamp((now - started) / 3200, 0, 1))
        : 0;
      const settle = reduced ? 1 : arrival;
      const imgZoom =
        scene.mode === 0
          ? (1.12 - 0.12 * settle) * (1 + 0.07 * scene.zoom)
          : 1.07 - 0.07 * scene.frame;

      const f = scene.frame;
      renderer.draw(
        {
          exposure: scene.exposure,
          filmA: scene.filmA,
          filmB: scene.filmB,
          flood: scene.flood,
          frame: [
            mix(0, screen.left, f) * dpr,
            mix(0, screen.top, f) * dpr,
            mix(vw, screen.width, f) * dpr,
            mix(vh, screen.height, f) * dpr,
          ],
          grain: reduced ? 0.04 : 0.08,
          imgZoom,
          mix: scene.mix,
          mode: scene.mode,
          pointer: [pointer.x, pointer.y],
          radius: 3 * dpr * f,
          reeds: portrait ? 6 : 11,
          room: f,
          time: reduced ? 0 : now / 1000,
          velocity: reduced ? 0 : velocity,
          word: {
            box: wordLayout.box,
            focal: wordLayout.focal,
            focalTo: [(vw * dpr) / 2, (vh * dpr) / 2],
            parallax: reduced ? 0 : 7 * dpr,
            rise,
            shift: clamp(scene.zoom / 0.7, 0, 1),
            zoom: Math.exp(Math.log(wordLayout.zoom) * scene.zoom),
          },
        },
        [lightOf(scene.filmA), lightOf(scene.filmB)],
      );
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
      stopPointer();
      canvasEl.removeEventListener("webglcontextrestored", restore);
      renderer?.dispose();
    };
  }, [engine, films, generation, length, reduced, scrollY]);

  return (
    <section
      ref={section}
      aria-label="Trending this week"
      className="relative"
      style={{ height: `${(length + 1) * 100}svh` }}
    >
      <div
        ref={stage}
        className="sticky top-0 h-svh w-full overflow-hidden bg-black"
      >
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 block size-full"
        />

        <div ref={heroLayer} className="absolute inset-0">
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
          <div ref={showLayer} className="invisible absolute inset-0 opacity-0">
            <NowShowing
              active={active.index}
              direction={active.direction}
              films={films}
              plain={plain}
              week={week}
            />
          </div>
        )}
      </div>
    </section>
  );
}
