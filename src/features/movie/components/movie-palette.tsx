"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cancelFrame, frame } from "motion/react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { MovieImage } from "@/infrastructure/tmdb/types";
import { Cascade, Header, Item, Section, Trace } from "../stage";
import { size, spread } from "../lib/tempo";
import { ImageModal, type ImageModalData } from "./movie-modals";

interface Still {
  colour: string;
  order: number;
  path: string;
}

const READ = { height: 14, width: 24 };
const SPREAD = { gain: 9, reach: 1.7 };
const MIN_STILLS = 6;

function meanColour(image: HTMLImageElement): [number, number, number] | null {
  const canvas = document.createElement("canvas");
  canvas.width = READ.width;
  canvas.height = READ.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, READ.width, READ.height);
  const { data } = context.getImageData(0, 0, READ.width, READ.height);
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i] ** 2;
    g += data[i + 1] ** 2;
    b += data[i + 2] ** 2;
  }
  const n = data.length / 4;
  return [Math.sqrt(r / n), Math.sqrt(g / n), Math.sqrt(b / n)].map(
    Math.round,
  ) as [number, number, number];
}

function orderOf([r, g, b]: [number, number, number]) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  const chroma = max - min;
  if (chroma < 0.06) return 400 + lightness;
  let hue: number;
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  if (max === rn) hue = ((gn - bn) / chroma + 6) % 6;
  else if (max === gn) hue = (bn - rn) / chroma + 2;
  else hue = (rn - gn) / chroma + 4;
  return hue * 60;
}

function useStills(images: MovieImage[], near: boolean) {
  const [stills, setStills] = useState<Still[] | null>(null);
  const key = images.map((image) => image.filePath).join("|");

  useEffect(() => {
    if (!near || !key) return;
    let live = true;
    const paths = key.split("|");
    void Promise.all(
      paths.map(
        (path) =>
          new Promise<Still | null>((resolve) => {
            const src = tmdbImageUrl("backdrop", path, "w300");
            if (!src) return resolve(null);
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.decoding = "async";
            image.onload = () => {
              const colour = meanColour(image);
              resolve(
                colour
                  ? { colour: colour.join(" "), order: orderOf(colour), path }
                  : null,
              );
            };
            image.onerror = () => resolve(null);
            image.src = src;
          }),
      ),
    ).then((read) => {
      if (!live) return;
      const found = read.filter((still): still is Still => still !== null);
      setStills(found.sort((a, b) => a.order - b.order));
    });
    return () => {
      live = false;
    };
  }, [key, near]);

  return stills;
}

function Strip({
  onOpen,
  stills,
}: {
  onOpen: (index: number) => void;
  stills: Still[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const count = stills.length;

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const weights = new Float32Array(count).fill(1);
    const targets = new Float32Array(count).fill(1);
    let running = false;

    const write = () => {
      element.style.setProperty(
        "--bars",
        Array.from(weights, (weight) => `${weight.toFixed(3)}fr`).join(" "),
      );
      weights.forEach((weight, index) => {
        bars.current[index]?.style.setProperty(
          "--open",
          Math.min(1, (weight - 1) / (SPREAD.gain * 0.55)).toFixed(3),
        );
      });
    };
    const step = () => {
      let moving = false;
      for (let i = 0; i < count; i++) {
        const next = weights[i] + (targets[i] - weights[i]) * 0.2;
        if (Math.abs(next - targets[i]) > 0.002) moving = true;
        weights[i] = Math.abs(next - targets[i]) > 0.002 ? next : targets[i];
      }
      write();
      if (!moving) {
        running = false;
        cancelFrame(step);
      }
    };
    const aim = (at: number | null) => {
      for (let i = 0; i < count; i++) {
        const distance = at === null ? Infinity : (i + 0.5 - at) / SPREAD.reach;
        targets[i] = 1 + SPREAD.gain * Math.exp(-(distance * distance));
      }
      if (!running) {
        running = true;
        frame.update(step, true);
      }
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      aim(((event.clientX - rect.left) / rect.width) * count);
    };
    const leave = () => aim(null);
    const focus = (event: FocusEvent) => {
      const index = bars.current.findIndex((bar) =>
        bar?.contains(event.target as Node),
      );
      if (index >= 0) aim(index + 0.5);
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("focusin", focus);
    element.addEventListener("focusout", leave);
    write();
    return () => {
      cancelFrame(step);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("focusin", focus);
      element.removeEventListener("focusout", leave);
    };
  }, [count]);

  return (
    <div
      ref={box}
      style={{ "--bars": `repeat(${count}, 1fr)` } as CSSProperties}
    >
      <Cascade
        className="relative grid h-36 [grid-template-columns:var(--bars)] overflow-hidden rounded-[20px]"
        gap={spread(count, size(1))}
      >
        <Trace className="pointer-events-none absolute inset-0 z-10 rounded-[20px] ring-1 ring-white/5 ring-inset" />
        {stills.map((still, index) => (
          <Item className="relative min-w-0" key={still.path}>
            <button
              aria-label={`Still ${index + 1} of ${count}`}
              className="relative block size-full cursor-pointer overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-white/60 focus-visible:ring-inset"
              onClick={() => onOpen(index)}
              ref={(element) => {
                bars.current[index] = element;
              }}
              style={{ backgroundColor: `rgb(${still.colour})` }}
              type="button"
            >
              <img
                alt=""
                className="absolute inset-0 size-full object-cover"
                decoding="async"
                loading="lazy"
                src={tmdbImageUrl("backdrop", still.path, "w780") ?? undefined}
                style={{
                  opacity: "var(--open, 0)",
                  scale: "calc(1.12 - var(--open, 0) * 0.12)",
                }}
              />
            </button>
          </Item>
        ))}
      </Cascade>
    </div>
  );
}

export function MoviePalette({
  stills: images,
  title,
}: {
  stills: MovieImage[];
  title: string;
}) {
  const [openImage] = useModal(ImageModal);
  const anchor = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const stills = useStills(images, near);

  useEffect(() => {
    const element = anchor.current;
    if (!element) return;
    const sight = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          sight.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );
    sight.observe(element);
    return () => sight.disconnect();
  }, []);

  if (images.length < MIN_STILLS) return null;

  const open = (index: number) => {
    const still = stills?.[index];
    const src = still ? tmdbImageUrl("backdrop", still.path, "original") : null;
    if (!src) return;
    const data: ImageModalData = {
      alt: `Still ${index + 1} of ${title}`,
      src,
    };
    void openImage(data as unknown as Record<string, unknown>);
  };

  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:pallete-2-bold" title="Palette" />
      <div className="min-h-36" ref={anchor}>
        {stills && stills.length >= MIN_STILLS ? (
          <Strip onOpen={open} stills={stills} />
        ) : null}
      </div>
    </Section>
  );
}
