"use client";

import { useEffect, useRef } from "react";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { pointerSample, watchPointer } from "../pointer";
import { useHydratedReducedMotion } from "../reduced";

type Mode =
  "action" | "card" | "drag" | "frame" | "idle" | "none" | "text" | "wrap";

interface Reading {
  corner?: number;
  label: string;
  mode: Mode;
  target: HTMLElement | null;
}

interface Shape {
  bracket: number;
  caption: number;
  dot: number;
  glass: number;
  h: number;
  label: number;
  r: number;
  solid: number;
  w: number;
}

interface Spring {
  v: number;
  x: number;
}

const SHAPES: Record<Exclude<Mode, "none">, Shape> = {
  action: {
    bracket: 0,
    caption: 0,
    dot: 0,
    glass: 1,
    h: 0,
    label: 0,
    r: 0,
    solid: 0,
    w: 0,
  },
  card: {
    bracket: 1,
    caption: 1,
    dot: 1,
    glass: 0,
    h: 0,
    label: 0,
    r: 4,
    solid: 0,
    w: 0,
  },
  drag: {
    bracket: 0,
    caption: 0,
    dot: 0,
    glass: 1,
    h: 46,
    label: 1,
    r: 23,
    solid: 0,
    w: 96,
  },
  frame: {
    bracket: 1,
    caption: 0,
    dot: 1,
    glass: 0,
    h: 116,
    label: 0,
    r: 4,
    solid: 0,
    w: 116,
  },
  idle: {
    bracket: 0,
    caption: 0,
    dot: 1,
    glass: 1,
    h: 34,
    label: 0,
    r: 17,
    solid: 0,
    w: 34,
  },
  text: {
    bracket: 0,
    caption: 0,
    dot: 0,
    glass: 0,
    h: 26,
    label: 0,
    r: 1,
    solid: 1,
    w: 2,
  },
  wrap: {
    bracket: 1,
    caption: 0,
    dot: 1,
    glass: 0,
    h: 0,
    label: 0,
    r: 4,
    solid: 0,
    w: 0,
  },
};

const LABELS: Partial<Record<Mode, string>> = { card: "View", drag: "Drag" };

const TEXT_INPUT =
  "input:not([type=button],[type=checkbox],[type=file],[type=image],[type=radio],[type=range],[type=reset],[type=submit]), textarea, [contenteditable=''], [contenteditable='true']";
const OWNER = `[data-cursor], [data-dragging], ${TEXT_INPUT}, a[href], button, summary, select, label, [role='button'], [role='link'], [role='tab'], [role='switch'], [role='menuitem']`;

const WRAP = 7;
const FRAMING = 14;
const CARD_FRAMING = 6;
const SLATE = /^(.*\S)\s+\((\d{4})\)(?:,\s*(.+))?$/;
// The slate centres over its frame but keeps this far inside the window.
const SLATE_MARGIN = 12;
const SNAP_MAX = [560, 280] as const;
const ROW_MAX = [960, 120] as const;
const FRAME_AWAY = 0.7;
const RELEASED = "data-reticle-off";
const MAGNET = 0.08;
const MAGNET_MAX = 6;
const LEAVE_GRACE = 90;
const STEP = 1 / 240;
const MOST = 1 / 20;

interface Tune {
  damping: number;
  stiffness: number;
}

const tune = (stiffness: number, ratio: number): Tune => ({
  damping: 2 * ratio * Math.sqrt(stiffness),
  stiffness,
});
const FOLLOW = tune(190, 0.9);
const GRIP = tune(360, 0.96);
const HUNT = tune(130, 0.78);
const FADE = tune(170, 1);
const PRESS = tune(420, 0.62);
const TURN = 9;
const STILL = 0.01;

const spring = (x = 0): Spring => ({ v: 0, x });

const IDLE: Reading = { label: "", mode: "idle", target: null };

function pull(s: Spring, to: number, dt: number, { damping, stiffness }: Tune) {
  s.v += ((to - s.x) * stiffness - s.v * damping) * dt;
  s.x += s.v * dt;
}

const unit = (n: number) => Math.max(0, Math.min(n, 1));

function layerOf(from: Element): HTMLElement | null {
  for (let node: Element | null = from; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position === "static") continue;
    if (Number.parseInt(style.zIndex, 10) >= Z_INDEX.DOCK_BACKDROP) {
      return node instanceof HTMLElement ? node : null;
    }
  }
  return null;
}

interface Box {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface Ink {
  above: number;
  below: number;
  key: string;
  lead: number;
  tail: number;
}

const inks = new WeakMap<HTMLElement, Ink>();
let ruler: CanvasRenderingContext2D | null = null;

function inkOf(element: HTMLElement): Ink | null {
  const style = getComputedStyle(element);
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const raw = element.textContent ?? "";
  const text =
    style.textTransform === "uppercase"
      ? raw.toUpperCase()
      : style.textTransform === "lowercase"
        ? raw.toLowerCase()
        : raw;
  const key = `${font}|${text}|${document.fonts.status}`;
  const known = inks.get(element);
  if (known?.key === key) return known;
  ruler ??= document.createElement("canvas").getContext("2d");
  if (!ruler || !text.trim()) return null;
  ruler.font = font;
  const m = ruler.measureText(text.trim());
  const ink: Ink = {
    above: m.fontBoundingBoxAscent - m.actualBoundingBoxAscent,
    below: m.fontBoundingBoxAscent + m.actualBoundingBoxDescent,
    key,
    lead: -m.actualBoundingBoxLeft,
    tail: m.width - m.actualBoundingBoxRight,
  };
  inks.set(element, ink);
  return ink;
}

function boxOf(target: HTMLElement): Box {
  const drawn = target.dataset.cursorBox?.split(",").map(Number);
  if (drawn?.length === 4 && drawn.every(Number.isFinite)) {
    const [left, top, right, bottom] = drawn as [
      number,
      number,
      number,
      number,
    ];
    return { bottom, left, right, top };
  }
  const picture =
    target.dataset.cursor === "card"
      ? target.querySelector<HTMLElement>("[data-cursor-frame]")
      : null;
  const plain = (picture ?? target).getBoundingClientRect();
  if (target.dataset.cursorFit !== "ink") return plain;
  const ink = inkOf(target);
  if (!ink) return plain;
  const box = {
    bottom: -Infinity,
    left: Infinity,
    right: -Infinity,
    top: Infinity,
  };
  const walk = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    if (!node.textContent?.trim()) continue;
    range.selectNodeContents(node);
    for (const line of range.getClientRects()) {
      if (!line.width) continue;
      box.left = Math.min(box.left, line.left);
      box.right = Math.max(box.right, line.right);
      box.top = Math.min(box.top, line.top + ink.above);
      box.bottom = Math.max(box.bottom, line.top + ink.below);
    }
  }
  if (!Number.isFinite(box.left)) return plain;
  box.left += ink.lead;
  box.right -= ink.tail;
  return box;
}

function read(x: number, y: number): Reading {
  const hit = document.elementFromPoint(x, y);
  if (!hit || hit.tagName === "IFRAME") {
    return { label: "", mode: "none", target: null };
  }
  const layer = layerOf(hit);
  if (layer) return { label: "", mode: "none", target: layer };

  const dragging = hit.closest<HTMLElement>("[data-dragging]");
  if (dragging) return { label: LABELS.drag!, mode: "drag", target: dragging };

  const own = hit.closest<HTMLElement>(OWNER);
  if (own) {
    const named = own.dataset.cursor as Mode | undefined;
    if (named === "none") return { label: "", mode: "none", target: own };
    const label = own.dataset.cursorLabel ?? "";
    if (named === "wrap") {
      const box = boxOf(own);
      const inside =
        x >= box.left - FRAMING &&
        x <= box.right + FRAMING &&
        y >= box.top - FRAMING &&
        y <= box.bottom + FRAMING;
      if (inside) return { label: "", mode: "wrap", target: own };
    } else if (named && named in SHAPES) {
      const corner = Number.parseFloat(own.dataset.cursorCorner ?? "");
      return {
        corner: Number.isFinite(corner) ? corner : undefined,
        label: label || LABELS[named] || "",
        mode: named,
        target: own,
      };
    }
    if (own.matches(TEXT_INPUT))
      return { label: "", mode: "text", target: own };
    if (own.matches(":disabled, [aria-disabled='true']")) {
      return { label: "", mode: "idle", target: null };
    }
    const box = own.getBoundingClientRect();
    const fits = (limit: readonly [number, number]) =>
      box.width <= limit[0] && box.height <= limit[1];
    if (fits(SNAP_MAX) || fits(ROW_MAX)) {
      const corner = Number.parseFloat(
        getComputedStyle(own).borderTopLeftRadius,
      );
      return { corner, label: "", mode: "action", target: own };
    }
  }

  const stage = document.querySelector<HTMLElement>("[data-cursor-stage]");
  if (stage) {
    const box = stage.getBoundingClientRect();
    const inside =
      x >= box.left &&
      x <= box.right &&
      y >= box.top &&
      y <= box.top + box.height * FRAME_AWAY;
    if (inside) return { label: "", mode: "frame", target: stage };
  }
  return { label: "", mode: "idle", target: null };
}

function Reticle() {
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLSpanElement>(null);
  const brackets = useRef<HTMLSpanElement>(null);
  const slate = useRef<HTMLSpanElement>(null);
  const slateName = useRef<HTMLSpanElement>(null);
  const slateYear = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = root.current;
    const lens = body.current;
    const pin = dot.current;
    const text = words.current;
    const corners = brackets.current;
    const caption = slate.current;
    const name = slateName.current;
    const year = slateYear.current;
    if (!host || !lens || !pin || !text || !corners) return;
    if (!caption || !name || !year) return;

    const html = document.documentElement;
    const stopWatching = watchPointer();
    html.classList.add("reticle");

    const edge = {
      b: spring(),
      l: spring(),
      r: spring(),
      t: spring(),
    };
    const radius = spring(SHAPES.idle.r);
    const weights = {
      bead: spring(1),
      bracket: spring(),
      caption: spring(),
      dot: spring(1),
      glass: spring(1),
      label: spring(),
      presence: spring(),
      solid: spring(),
    };
    const press = spring(1);
    const slide = spring();
    let slateWidth = 0;

    let reading: Reading = { label: "", mode: "idle", target: null };
    let shown = "";
    let slated = "";
    let slating = "";
    let slatedAt = 0;
    const roll = (
      track: HTMLElement,
      value: string,
      way: number,
      still: boolean,
    ) => {
      for (const old of Array.from(track.children) as HTMLElement[]) {
        if (still || old.classList.contains("home-ticker-out")) {
          old.remove();
          continue;
        }
        old.className = "home-ticker-out [grid-area:1/1] truncate";
        old.style.setProperty("--to", `${way * -0.7}em`);
        old.addEventListener("animationend", () => old.remove(), {
          once: true,
        });
      }
      if (!value) return;
      const word = document.createElement("span");
      word.className = still
        ? "[grid-area:1/1] truncate"
        : "home-ticker-in [grid-area:1/1] truncate";
      word.style.setProperty("--from", `${way * 0.7}em`);
      word.textContent = value;
      track.append(word);
    };
    let dirty = true;
    let pressed = false;
    let landed = false;
    let leaving = 0;
    let busy = 0;
    let heading = { x: 1, y: 0 };
    let last = performance.now();
    let seen = { x: 0, y: 0 };
    let owed = 0;
    let raf = 0;
    let released: HTMLElement | null = null;
    const written = new Map<string, string>();
    const put = (
      element: HTMLElement,
      key: string,
      property:
        | "background"
        | "borderRadius"
        | "boxShadow"
        | "color"
        | "height"
        | "opacity"
        | "transform"
        | "width",
      value: string,
    ) => {
      if (written.get(key) === value) return;
      written.set(key, value);
      element.style[property] = value;
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const mark = () => {
      dirty = true;
      wake();
    };
    const down = () => {
      pressed = true;
      wake();
    };
    const up = () => {
      pressed = false;
      mark();
    };

    const resolve = (now: number, x: number, y: number) => {
      const next = read(x, y);
      const holding =
        next.mode === "idle" &&
        reading.mode !== "idle" &&
        reading.mode !== "none" &&
        reading.target?.isConnected;
      if (holding) {
        leaving ||= now + LEAVE_GRACE;
        if (now < leaving) return;
      }
      leaving = 0;
      dirty = false;
      reading = next;
      if (next.mode === "card") slating = next.label;
      else if (next.label !== shown) {
        shown = next.label;
        if (next.label) text.textContent = next.label;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = Math.min((now - last) / 1000, MOST);
      last = now;
      if (elapsed <= 0) return;

      const pointer = pointerSample();
      const scrolling = html.hasAttribute("data-scrolling");
      if (scrolling) {
        if (reading.mode !== "none") reading = IDLE;
        dirty = true;
      } else if (dirty && pointer.present) {
        resolve(now, pointer.x, pointer.y);
      }

      const px = pointer.x;
      const py = pointer.y;
      const speed = Math.hypot(px - seen.x, py - seen.y) / elapsed;
      seen = { x: px, y: py };
      busy += (unit(speed / 1800) - busy) * Math.min(elapsed * 7, 1);

      const hidden = reading.mode === "none" || !pointer.present;
      const off = reading.mode === "none" ? reading.target : null;
      if (off !== released) {
        released?.removeAttribute(RELEASED);
        off?.setAttribute(RELEASED, "");
        released = off;
      }
      const mode = reading.mode === "none" ? "idle" : reading.mode;
      const shape = SHAPES[mode];
      const snap =
        (mode === "action" || mode === "card" || mode === "wrap") &&
        Boolean(reading.target?.isConnected);

      let cx = px;
      let cy = py;
      let tw = shape.w;
      let th = shape.h;
      let tr = shape.r;

      if (snap) {
        const box = boxOf(reading.target!);
        const pad =
          mode === "wrap" ? FRAMING : mode === "card" ? CARD_FRAMING : WRAP;
        const corner = reading.corner ?? Number.NaN;
        const mx = (box.left + box.right) / 2;
        const my = (box.top + box.bottom) / 2;
        const lean = (to: number, from: number) =>
          Math.max(-MAGNET_MAX, Math.min((to - from) * MAGNET, MAGNET_MAX));
        cx = mx + lean(px, mx);
        cy = my + lean(py, my);
        tw = box.right - box.left + pad * 2;
        th = box.bottom - box.top + pad * 2;
        tr = Math.min(
          (Number.isFinite(corner) ? corner : 12) + pad,
          Math.min(tw, th) / 2,
        );
      } else if (mode === "frame") {
        const grow = 1 + busy * 0.34;
        tw *= grow;
        th *= grow;
      }

      if (hidden && weights.presence.x < 0.02) landed = false;
      if (!landed && pointer.present) {
        edge.l.x = cx - tw / 2;
        edge.r.x = cx + tw / 2;
        edge.t.x = cy - th / 2;
        edge.b.x = cy + th / 2;
        radius.x = tr;
        for (const key of Object.keys(edge) as (keyof typeof edge)[]) {
          edge[key].v = 0;
        }
        landed = true;
      }

      if (slating !== slated) {
        const still = weights.caption.x < 0.06;
        const way = cx >= slatedAt ? 1 : -1;
        slated = slating;
        slatedAt = cx;
        const [, title = slated, made = ""] = SLATE.exec(slated) ?? [];
        roll(name, title, way, still);
        roll(year, made, way, still);
        year.hidden = !made;
      }

      const travel = snap ? GRIP : mode === "frame" ? HUNT : FOLLOW;
      const width = Math.max(edge.r.x - edge.l.x, 0);
      const height = Math.max(edge.b.x - edge.t.x, 0);
      const inset = 12 / Math.max(width, height, 1);
      const centred = Math.min(
        Math.max((width - slateWidth) / 2, SLATE_MARGIN - edge.l.x),
        window.innerWidth - SLATE_MARGIN - slateWidth - edge.l.x,
      );
      // A slate coming up starts where it belongs; one already up glides.
      if (weights.caption.x < 0.06) slide.x = centred;

      const goals: [Spring, number, Tune][] = [
        [edge.l, cx - tw / 2, travel],
        [edge.r, cx + tw / 2, travel],
        [edge.t, cy - th / 2, travel],
        [edge.b, cy + th / 2, travel],
        [radius, tr, travel],
        [weights.bead, mode === "idle" ? 1 : 0, FADE],
        [weights.bracket, shape.bracket, FADE],
        [weights.caption, shape.caption, FADE],
        [weights.dot, shape.dot, FADE],
        [weights.glass, shape.glass, FADE],
        [weights.label, shape.label, FADE],
        [weights.solid, shape.solid, FADE],
        [weights.presence, hidden ? 0 : 1, FADE],
        [press, pressed ? 1 - Math.min(inset, 0.14) : 1, PRESS],
        [slide, centred, FADE],
      ];
      owed += elapsed;
      while (owed >= STEP) {
        owed -= STEP;
        for (const [state, to, feel] of goals) pull(state, to, STEP, feel);
      }

      const vx = (edge.l.v + edge.r.v) / 2;
      const vy = (edge.t.v + edge.b.v) / 2;
      const flow = Math.hypot(vx, vy);
      if (flow > 40) {
        const k = Math.min(elapsed * TURN, 1);
        const hx = heading.x + (vx / flow - heading.x) * k;
        const hy = heading.y + (vy / flow - heading.y) * k;
        const norm = Math.hypot(hx, hy) || 1;
        heading = { x: hx / norm, y: hy / norm };
      }
      const angle = Math.atan2(heading.y, heading.x);
      const smear = unit(flow / 2600) * 0.42 * unit(weights.bead.x);
      const along = 1 + smear;
      const across = 1 / along;

      const presence = unit(weights.presence.x);
      const solid = unit(weights.solid.x);
      const glass = unit(weights.glass.x);
      const ink = Math.round(255 * (1 - solid));
      const scale = Math.max(press.x, 0);

      const fine = (n: number) => n.toFixed(3);
      put(host, "presence", "opacity", fine(presence));
      put(lens, "width", "width", `${width.toFixed(2)}px`);
      put(lens, "height", "height", `${height.toFixed(2)}px`);
      put(
        lens,
        "radius",
        "borderRadius",
        `${Math.max(radius.x, 0).toFixed(2)}px`,
      );
      put(
        lens,
        "lens",
        "transform",
        `translate3d(${edge.l.x.toFixed(2)}px, ${edge.t.x.toFixed(2)}px, 0) rotate(${fine(angle)}rad) scale(${fine(along * scale)}, ${fine(across * scale)}) rotate(${fine(-angle)}rad)`,
      );
      put(
        lens,
        "fill",
        "background",
        `rgb(255 255 255 / ${fine(glass * 0.035 * (1 - solid) + solid * 0.94)})`,
      );
      put(
        lens,
        "shadow",
        "boxShadow",
        `inset 0 0 0 1px rgb(255 255 255 / ${fine(glass * 0.3 * (1 - solid))}), 0 0 0 1px rgb(0 0 0 / ${fine((glass + solid) * 0.12)}), 0 8px 28px rgb(0 0 0 / ${fine(solid * 0.22)})`,
      );
      put(corners, "brackets", "opacity", fine(unit(weights.bracket.x)));
      put(
        corners,
        "spread",
        "transform",
        `scale(${fine(1 + (1 - unit(weights.bracket.x)) * 0.25)})`,
      );
      put(text, "label", "opacity", fine(unit(weights.label.x)));
      put(caption, "caption", "opacity", fine(unit(weights.caption.x)));
      put(caption, "slide", "transform", `translateX(${slide.x.toFixed(2)}px)`);
      put(text, "ink", "color", `rgb(${ink} ${ink} ${ink})`);
      put(
        pin,
        "pin",
        "transform",
        `translate3d(${px - 2.5}px, ${py - 2.5}px, 0)`,
      );
      put(pin, "dot", "opacity", fine(unit(weights.dot.x) * presence));

      const resting =
        (!dirty || !pointer.present) &&
        !scrolling &&
        !snap &&
        busy < 0.002 &&
        goals.every(
          ([state, to]) =>
            Math.abs(state.v) < STILL && Math.abs(state.x - to) < STILL,
        );
      if (resting) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const env = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => {
      html.classList.toggle("reticle", env.matches);
      wake();
    };
    sync();
    env.addEventListener("change", sync);

    // Read after layout, so following the slate's width never forces one.
    const sizing = new ResizeObserver(([entry]) => {
      slateWidth = entry?.borderBoxSize[0]?.inlineSize ?? 0;
      wake();
    });
    sizing.observe(caption);

    const watch = new MutationObserver(mark);
    watch.observe(document.body, {
      attributeFilter: ["data-cursor", "data-cursor-label"],
      attributes: true,
      subtree: true,
    });
    window.addEventListener("pointermove", mark, { passive: true });
    window.addEventListener("scroll", mark, { capture: true, passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("blur", up);
    wake();

    return () => {
      cancelAnimationFrame(raf);
      watch.disconnect();
      sizing.disconnect();
      env.removeEventListener("change", sync);
      window.removeEventListener("pointermove", mark);
      window.removeEventListener("scroll", mark, { capture: true });
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("blur", up);
      html.classList.remove("reticle");
      released?.removeAttribute(RELEASED);
      stopWatching();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden opacity-0 [@media(hover:none),(pointer:coarse)]:hidden"
      ref={root}
      style={{ zIndex: Z_INDEX.TOOLTIP + 20 }}
    >
      <div
        className="absolute top-0 left-0 flex items-center justify-center will-change-transform"
        ref={body}
      >
        <span
          className="absolute -inset-px"
          ref={brackets}
          style={{ opacity: 0 }}
        >
          <i className="absolute top-0 left-0 size-3.5 rounded-tl-[3px] border-t-[1.5px] border-l-[1.5px] border-white/90" />
          <i className="absolute top-0 right-0 size-3.5 rounded-tr-[3px] border-t-[1.5px] border-r-[1.5px] border-white/90" />
          <i className="absolute bottom-0 left-0 size-3.5 rounded-bl-[3px] border-b-[1.5px] border-l-[1.5px] border-white/90" />
          <i className="absolute right-0 bottom-0 size-3.5 rounded-br-[3px] border-r-[1.5px] border-b-[1.5px] border-white/90" />
        </span>
        <span
          className="tabular-nums text-[10px] leading-none font-bold tracking-[0.16em] whitespace-nowrap uppercase"
          ref={words}
          style={{ opacity: 0 }}
        />
        <span
          className="absolute bottom-full left-0 mb-2.5 flex w-max max-w-[calc(100vw-2rem)] items-center gap-2 tabular-nums text-[10px] leading-none font-bold tracking-[0.16em] whitespace-nowrap text-white uppercase [text-shadow:0_1px_10px_rgb(0_0_0/0.7)]"
          ref={slate}
          style={{ opacity: 0 }}
        >
          <span
            className="relative inline-grid min-w-0 overflow-hidden"
            ref={slateName}
          />
          <span
            className="relative inline-grid shrink-0 overflow-hidden border-l border-white/20 pl-2 text-white/50"
            hidden
            ref={slateYear}
          />
        </span>
      </div>
      <div
        className="absolute top-0 left-0 size-[5px] rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)]"
        ref={dot}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

export function Cursor() {
  const reduced = useHydratedReducedMotion();
  return reduced ? null : <Reticle />;
}
