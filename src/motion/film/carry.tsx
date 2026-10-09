"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";

interface Rect {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface Picked {
  at: number;
  frame: HTMLElement;
  image: HTMLImageElement;
  path: string;
  radius: number;
  rect: Rect;
  src: string;
  zoom: number;
}

type Phase = "drop" | "fade" | "fly";

interface Flight extends Picked {
  id: number;
  phase: Phase;
  run: number;
  slot: Rect & { radius: number };
  landing?: {
    done: () => void;
    reveal: number;
    target: HTMLElement;
  };
}

const PICK_FRESH = 1500;
const UNCLAIMED = 20_000;
const FADE = 0.28;
const DECODE_LIMIT = 450;

const ACROSS = "cubic-bezier(0.5, 0, 0.12, 1)";
const DOWN = "cubic-bezier(0.72, 0, 0.24, 1)";
const GROW = "cubic-bezier(0.6, 0, 0.2, 1)";
const WASH = 0.6;
const WASH_DIM = 0.68;

let picked: Picked | null = null;
let flight: Flight | null = null;
let ids = 0;

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const notify = () => listeners.forEach((listener) => listener());
const set = (next: Flight | null) => {
  flight = next;
  notify();
};

const pathOf = (href: string) => {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
  return path || "/";
};

const FILM_PAGE = /^\/(?:movie|person)\/[^/]+$/;

const rectOf = (element: Element): Rect => {
  const box = element.getBoundingClientRect();
  return { height: box.height, left: box.left, top: box.top, width: box.width };
};

function frameOf(image: HTMLElement): HTMLElement {
  let element: HTMLElement | null = image.parentElement;
  while (element && element !== document.body) {
    const { overflow } = getComputedStyle(element);
    if (overflow === "hidden" || overflow === "clip") return element;
    element = element.parentElement;
  }
  return image;
}

const radiusOf = (element: Element) =>
  Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;

function slotAtTop(): Flight["slot"] | null {
  const slot = document.querySelector<HTMLElement>(
    "main[data-cinematic] [data-carry-slot]",
  );
  if (!slot) return null;
  const box = rectOf(slot);
  let top = box.top + window.scrollY;
  const column = slot.closest("aside");
  if (column?.parentElement && getComputedStyle(column).position === "sticky") {
    const row = column.parentElement.getBoundingClientRect();
    top = row.top + window.scrollY + (box.top - rectOf(column).top);
  }
  return { ...box, radius: radiusOf(slot), top };
}

const isOnScreen = (rect: Rect) =>
  rect.width > 0 &&
  rect.top + rect.height * 0.5 < window.innerHeight &&
  rect.top + rect.height * 0.5 > 0;

function onClick(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
    return;
  const link =
    event.target instanceof Element ? event.target.closest("a[href]") : null;
  const href = link?.getAttribute("href");
  if (!link || !href || !FILM_PAGE.test(pathOf(href))) return;
  const images = [...link.querySelectorAll("img")].filter(
    (image) => image.complete && image.naturalWidth > 0,
  );
  const image = images.sort(
    (a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight,
  )[0];
  if (!image) return;
  const frame = frameOf(image);
  const rect = rectOf(frame);
  if (rect.width < 8 || rect.height < 8) return;
  picked = {
    at: Date.now(),
    frame,
    image,
    path: pathOf(href),
    radius: radiusOf(frame),
    rect,
    src: image.currentSrc || image.src,
    zoom: image.getBoundingClientRect().width / rect.width || 1,
  };
}

export function liftCarry(to: string, run: number): boolean {
  const pick = picked;
  picked = null;
  if (!pick || pick.path !== pathOf(to) || Date.now() - pick.at > PICK_FRESH)
    return false;
  const slot = slotAtTop();
  if (!slot || !isOnScreen(slot)) return false;
  set({ ...pick, id: ++ids, phase: "fly", run, slot });
  return true;
}

export function dropCarry() {
  if (!flight || flight.phase !== "fly") return;
  set({ ...flight, phase: "drop" });
}

export function settleCarry() {
  if (flight?.phase === "fly" && !flight.landing) dropCarry();
}

export function isCarriedTo(pathname: string): boolean {
  return flight?.phase === "fly" && flight.path === pathOf(pathname);
}

const getFlight = () => flight;

function inCard(id: number, shown: boolean) {
  if (flight?.id === id) flight.frame.style.visibility = shown ? "" : "hidden";
}

export function useCarryingFrom(pathname: string): boolean {
  const now = useSyncExternalStore(subscribe, getFlight, () => null);
  return now?.phase === "fly" && now.path !== pathOf(pathname);
}

export function useLanding(
  target: RefObject<HTMLElement | null>,
  { reveal }: { reveal: number },
) {
  const pathname = usePathname();
  const [carriedHere] = useState(() => isCarriedTo(pathname));
  const [shown, setShown] = useState(!carriedHere);

  useLayoutEffect(() => {
    if (!carriedHere) return;
    const element = target.current;
    if (element && flight?.landing?.target === element) return;
    if (
      !element ||
      !flight ||
      flight.phase !== "fly" ||
      !isOnScreen(rectOf(element))
    ) {
      settleCarry();
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    set({
      ...flight,
      landing: { done: () => setShown(true), reveal, target: element },
    });
  }, [carriedHere, reveal, target]);

  return { carried: carriedHere, shown };
}

function decoded(image: HTMLImageElement, limit: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, limit);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const decode = () => void image.decode().then(done, done);
    if (image.complete && image.naturalWidth > 0) return decode();
    image.addEventListener("load", decode, { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

async function inPlace(image: HTMLImageElement, limit: number) {
  const until = performance.now() + limit;
  image.style.transition = "none";
  const frame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  while (
    performance.now() < until &&
    (image.dataset.state === "loading" ||
      getComputedStyle(image).opacity !== "1")
  ) {
    await frame();
  }
  await frame();
  image.style.transition = "";
}

function paintWash(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const width = 48;
  const height = Math.max(
    16,
    Math.round((width * window.innerHeight) / window.innerWidth),
  );
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context || !image.naturalWidth) return;
  const scale =
    Math.max(width / image.naturalWidth, height / image.naturalHeight) * 1.3;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  if ("filter" in context) context.filter = "blur(4px) saturate(1.35)";
  context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  context.filter = "none";
  context.fillStyle = `rgb(0 0 0 / ${WASH_DIM})`;
  context.fillRect(0, 0, width, height);
}

const px = (value: number) => `${value.toFixed(3)}px`;

export function Carry() {
  const now = useSyncExternalStore(subscribe, getFlight, () => null);
  const wash = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const across = useRef<HTMLDivElement>(null);
  const down = useRef<HTMLDivElement>(null);
  const grow = useRef<HTMLDivElement>(null);
  const lift = useRef<HTMLDivElement>(null);
  const crop = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const flying = useRef<{ id: number; animations: Animation[] } | null>(null);

  useEffect(() => {
    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, []);

  const id = now?.id;
  const phase = now?.phase;
  const landing = now?.landing;

  useLayoutEffect(() => {
    const parts = [
      wash.current,
      canvas.current,
      across.current,
      down.current,
      grow.current,
      lift.current,
      crop.current,
      image.current,
    ];
    if (!now || now.phase !== "fly" || parts.some((part) => !part)) return;
    if (flying.current?.id === now.id) return;
    const [room, light, x, y, scaler, pop, clip, picture] =
      parts as HTMLElement[];
    const { rect: from, slot } = now;

    const s0 = Math.max(from.width / slot.width, from.height / slot.height);
    const insetX = (slot.width - from.width / s0) / 2;
    const insetY = (slot.height - from.height / s0) / 2;
    const clip0 = `inset(${px(insetY)} ${px(insetX)} ${px(insetY)} ${px(insetX)} round ${px(now.radius / s0)})`;
    const clip1 = `inset(0px 0px 0px 0px round ${px(slot.radius)})`;
    const x0 = from.left - insetX * s0;
    const y0 = from.top - insetY * s0;

    scaler.style.width = px(slot.width);
    scaler.style.height = px(slot.height);
    paintWash(light as HTMLCanvasElement, now.image);
    inCard(now.id, false);

    const timing = (easing: string): KeyframeAnimationOptions => ({
      duration: now.run * 1000,
      easing,
      fill: "forwards",
    });
    const tx = (value: number) => `translateX(${px(value)})`;
    const ty = (value: number) => `translateY(${px(value)})`;
    flying.current = {
      animations: [
        x.animate(
          [{ transform: tx(x0) }, { transform: tx(slot.left) }],
          timing(ACROSS),
        ),
        y.animate(
          [{ transform: ty(y0) }, { transform: ty(slot.top) }],
          timing(DOWN),
        ),
        scaler.animate(
          [{ transform: `scale(${s0})` }, { transform: "scale(1)" }],
          timing(GROW),
        ),
        clip.animate([{ clipPath: clip0 }, { clipPath: clip1 }], timing(GROW)),
        picture.animate(
          [{ transform: `scale(${now.zoom})` }, { transform: "scale(1)" }],
          timing(GROW),
        ),
        pop.animate(
          [
            { transform: "scale(1) rotate(0deg)" },
            {
              easing: "cubic-bezier(0.3, 0, 0.2, 1)",
              offset: 0.28,
              transform: "scale(1.07) rotate(-1.6deg)",
            },
            { transform: "scale(1) rotate(0deg)" },
          ],
          {
            duration: now.run * 1000,
            easing: "cubic-bezier(0.42, 0, 0.58, 1)",
            fill: "forwards",
          },
        ),
        room.animate([{ opacity: 0 }, { opacity: WASH }], {
          duration: now.run * 1000 * 0.8,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        }),
      ],
      id: now.id,
    };
  }, [id, phase]);

  useEffect(() => {
    const scaler = grow.current;
    const x = across.current;
    const y = down.current;
    const room = wash.current;
    const picture = image.current;
    if (!now || now.phase !== "fly" || !landing) return;
    if (!scaler || !x || !y || !room || !picture) return;
    const { done, target } = landing;
    const running: Animation[] = [];
    let live = true;

    const land = async () => {
      const own = flying.current?.id === now.id ? flying.current : null;
      if (own) await Promise.all(own.animations.map((a) => a.finished));
      if (!live) return;
      const hi = target.querySelector("img");
      if (hi) {
        await decoded(hi, DECODE_LIMIT);
        if (!live) return;
        await inPlace(hi, DECODE_LIMIT);
      }
      if (!live) return;
      const sharp = hi?.currentSrc || hi?.src;
      if (sharp && sharp !== picture.src) {
        const next = new Image();
        next.src = sharp;
        await decoded(next, DECODE_LIMIT);
        if (!live) return;
        if (next.complete && next.naturalWidth > 0) picture.src = sharp;
      }

      const { slot } = now;
      const last = rectOf(target);
      const miss = Math.hypot(last.left - slot.left, last.top - slot.top);
      const scale = last.width / slot.width;
      if (miss > 0.75 || Math.abs(scale - 1) > 0.004) {
        const timing: KeyframeAnimationOptions = {
          duration: Math.min(420, 160 + miss * 0.8),
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        };
        running.push(
          x.animate(
            [
              { transform: `translateX(${px(slot.left)})` },
              { transform: `translateX(${px(last.left)})` },
            ],
            timing,
          ),
          y.animate(
            [
              { transform: `translateY(${px(slot.top)})` },
              { transform: `translateY(${px(last.top)})` },
            ],
            timing,
          ),
          scaler.animate(
            [{ transform: "scale(1)" }, { transform: `scale(${scale})` }],
            timing,
          ),
        );
        await Promise.all(running.map((a) => a.finished));
        if (!live) return;
      }
      done();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!live || flight?.id !== now.id) return;
          set({ ...flight, phase: "fade" });
        }),
      );
    };
    void land().catch(() => {
      if (!live) return;
      done();
      if (flight?.id === now.id) set({ ...flight, phase: "fade" });
    });
    return () => {
      live = false;
      running.forEach((animation) => animation.cancel());
    };
  }, [id, landing]);

  useEffect(() => {
    const shell = lift.current;
    const room = wash.current;
    if (!now || (phase !== "fade" && phase !== "drop") || !shell || !room)
      return;
    const forget = () => {
      if (flight?.id === now.id) set(null);
    };
    const reveal = phase === "fade" ? (now.landing?.reveal ?? 0) : 0;
    const from = Number(getComputedStyle(room).opacity) || 0;
    const hold = reveal / (reveal + FADE);
    const animations = [
      shell.animate(
        [{ opacity: 1 }, { offset: hold, opacity: 1 }, { opacity: 0 }],
        {
          duration: (reveal + FADE) * 1000,
          easing: "linear",
          fill: "forwards",
        },
      ),
      room.animate([{ opacity: from }, { opacity: 0 }], {
        duration: (reveal || FADE * 2) * 1000,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      }),
    ];
    if (phase === "drop") inCard(now.id, true);
    let live = true;
    void Promise.all(animations.map((a) => a.finished)).then(
      () => live && forget(),
      () => undefined,
    );
    const unclaimed = setTimeout(forget, UNCLAIMED);
    return () => {
      live = false;
      clearTimeout(unclaimed);
    };
  }, [id, phase]);

  useEffect(() => {
    if (phase !== "fly") return;
    const timer = setTimeout(dropCarry, UNCLAIMED);
    return () => clearTimeout(timer);
  }, [id, phase]);

  if (!now) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      key={now.id}
      style={{ zIndex: Z_INDEX.DOCK_BACKDROP - 10 }}
    >
      <div className="absolute inset-0 opacity-0" ref={wash}>
        <canvas className="absolute inset-0 size-full" ref={canvas} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 35%, rgb(0 0 0 / 0.55))",
          }}
        />
      </div>
      <div className="absolute top-0 left-0 will-change-transform" ref={across}>
        <div className="will-change-transform" ref={down}>
          <div className="origin-top-left will-change-transform" ref={grow}>
            <div className="absolute inset-0" ref={lift}>
              <div className="absolute inset-0 overflow-hidden" ref={crop}>
                <img
                  alt=""
                  className="size-full object-cover"
                  ref={image}
                  src={now.src}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
