"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { pointerSample, watchPointer } from "./pointer";

// One cursor for the whole house. It is a lens that takes the shape of what it
// is over: a glass bead on empty ground, a viewfinder over the picture, a
// bracket that wraps a button, a disc on a poster, a bar in a field. Pages
// opt in with `data-cursor` (and `data-cursor-label`); links, buttons and
// fields are recognised without it.

type Mode = "action" | "card" | "drag" | "frame" | "idle" | "none" | "text";

interface Reading {
  label: string;
  mode: Mode;
  target: HTMLElement | null;
}

interface Shape {
  bracket: number;
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
    dot: 0,
    glass: 1,
    h: 0,
    label: 0,
    r: 0,
    solid: 0,
    w: 0,
  },
  card: {
    bracket: 0,
    dot: 0,
    glass: 0,
    h: 84,
    label: 1,
    r: 42,
    solid: 1,
    w: 84,
  },
  drag: {
    bracket: 0,
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
    dot: 1,
    glass: 1,
    h: 34,
    label: 0,
    r: 17,
    solid: 0,
    w: 34,
  },
  text: { bracket: 0, dot: 0, glass: 0, h: 26, label: 0, r: 1, solid: 1, w: 2 },
};

const LABELS: Partial<Record<Mode, string>> = { card: "View", drag: "Drag" };

const TEXT_INPUT =
  "input:not([type=button],[type=checkbox],[type=file],[type=image],[type=radio],[type=range],[type=reset],[type=submit]), textarea, [contenteditable=''], [contenteditable='true']";
const OWNER = `[data-cursor], [data-dragging], ${TEXT_INPUT}, a[href], button, summary, select, label, [role='button'], [role='link'], [role='tab'], [role='switch'], [role='menuitem']`;

const WRAP = 7;
const SNAP_MAX = [560, 280] as const;
const ROW_MAX = [960, 120] as const;
const FRAME_AWAY = 0.7;
const MAGNET = 0.08;
const MAGNET_MAX = 6;
const LEAVE_GRACE = 90;
const STEP = 1 / 240;
const MOST = 1 / 20;

interface Tune {
  damping: number;
  stiffness: number;
}

// Springs are named by how they should feel, not by raw constants: stiffness
// sets the pace and the damping ratio sets the character (1 never overshoots).
const tune = (stiffness: number, ratio: number): Tune => ({
  damping: 2 * ratio * Math.sqrt(stiffness),
  stiffness,
});
const FOLLOW = tune(420, 0.8);
const GRIP = tune(540, 0.92);
const HUNT = tune(300, 0.5);
const FADE = tune(320, 1);
const PRESS = tune(560, 0.5);
const TURN = 14;

const spring = (x = 0): Spring => ({ v: 0, x });

function pull(s: Spring, to: number, dt: number, { damping, stiffness }: Tune) {
  s.v += ((to - s.x) * stiffness - s.v * damping) * dt;
  s.x += s.v * dt;
}

const unit = (n: number) => Math.max(0, Math.min(n, 1));

// The cursor belongs to the pages. Everything the framework floats above them
// (dock, modals, menus, selects, notifications, tooltips) sits at or over its
// dock layer, and keeps the system cursor.
function inLayer(from: Element): boolean {
  for (let node: Element | null = from; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position === "static") continue;
    if (Number.parseInt(style.zIndex, 10) >= Z_INDEX.DOCK_BACKDROP) return true;
  }
  return false;
}

function read(x: number, y: number): Reading {
  const hit = document.elementFromPoint(x, y);
  if (!hit || hit.tagName === "IFRAME" || inLayer(hit)) {
    return { label: "", mode: "none", target: null };
  }

  const dragging = hit.closest<HTMLElement>("[data-dragging]");
  if (dragging) return { label: LABELS.drag!, mode: "drag", target: dragging };

  const own = hit.closest<HTMLElement>(OWNER);
  if (own) {
    const named = own.dataset.cursor as Mode | undefined;
    if (named === "none") return { label: "", mode: "none", target: own };
    const label = own.dataset.cursorLabel ?? "";
    if (named && named in SHAPES) {
      return { label: label || LABELS[named] || "", mode: named, target: own };
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
      return { label: "", mode: "action", target: own };
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

  useEffect(() => {
    const host = root.current;
    const lens = body.current;
    const pin = dot.current;
    const text = words.current;
    const corners = brackets.current;
    if (!host || !lens || !pin || !text || !corners) return;

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
      dot: spring(1),
      glass: spring(1),
      label: spring(),
      presence: spring(),
      solid: spring(),
    };
    const press = spring(1);

    let reading: Reading = { label: "", mode: "idle", target: null };
    let shown = "";
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

    const mark = () => {
      dirty = true;
    };
    const down = () => {
      pressed = true;
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
      if (next.label !== shown) {
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
      if (dirty && pointer.present) resolve(now, pointer.x, pointer.y);

      const px = pointer.x;
      const py = pointer.y;
      const speed = Math.hypot(px - seen.x, py - seen.y) / elapsed;
      seen = { x: px, y: py };
      busy += (unit(speed / 1800) - busy) * Math.min(elapsed * 7, 1);

      const hidden = reading.mode === "none" || !pointer.present;
      html.classList.toggle("reticle-off", reading.mode === "none");
      const mode = reading.mode === "none" ? "idle" : reading.mode;
      const shape = SHAPES[mode];
      const snap = mode === "action" && Boolean(reading.target?.isConnected);

      let cx = px;
      let cy = py;
      let tw = shape.w;
      let th = shape.h;
      let tr = shape.r;

      if (snap) {
        const box = reading.target!.getBoundingClientRect();
        const corner = parseFloat(
          getComputedStyle(reading.target!).borderTopLeftRadius,
        );
        const mx = box.left + box.width / 2;
        const my = box.top + box.height / 2;
        const lean = (to: number, from: number) =>
          Math.max(-MAGNET_MAX, Math.min((to - from) * MAGNET, MAGNET_MAX));
        cx = mx + lean(px, mx);
        cy = my + lean(py, my);
        tw = box.width + WRAP * 2;
        th = box.height + WRAP * 2;
        tr = Math.min(
          (Number.isFinite(corner) ? corner : 12) + WRAP,
          Math.min(tw, th) / 2,
        );
      } else if (mode === "frame") {
        const grow = 1 + busy * 0.34;
        tw *= grow;
        th *= grow;
      }

      // A gap in the pointer's travel (it left the window) is not a flight
      // path: when it returns the lens appears under it instead of crossing.
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

      const travel = snap ? GRIP : mode === "frame" ? HUNT : FOLLOW;
      const width = Math.max(edge.r.x - edge.l.x, 0);
      const height = Math.max(edge.b.x - edge.t.x, 0);
      const inset = 12 / Math.max(width, height, 1);

      owed += elapsed;
      while (owed >= STEP) {
        owed -= STEP;
        pull(edge.l, cx - tw / 2, STEP, travel);
        pull(edge.r, cx + tw / 2, STEP, travel);
        pull(edge.t, cy - th / 2, STEP, travel);
        pull(edge.b, cy + th / 2, STEP, travel);
        pull(radius, tr, STEP, travel);
        pull(weights.bead, mode === "idle" ? 1 : 0, STEP, FADE);
        pull(weights.bracket, shape.bracket, STEP, FADE);
        pull(weights.dot, shape.dot, STEP, FADE);
        pull(weights.glass, shape.glass, STEP, FADE);
        pull(weights.label, shape.label, STEP, FADE);
        pull(weights.solid, shape.solid, STEP, FADE);
        pull(weights.presence, hidden ? 0 : 1, STEP, FADE);
        pull(press, pressed ? 1 - Math.min(inset, 0.14) : 1, STEP, PRESS);
      }

      // The bead stretches along its own motion, not the pointer's: it is the
      // lens's velocity that carries the weight, so it relaxes as it settles.
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

      host.style.opacity = String(presence);
      lens.style.width = `${width}px`;
      lens.style.height = `${height}px`;
      lens.style.borderRadius = `${Math.max(radius.x, 0)}px`;
      lens.style.transform = `translate3d(${edge.l.x}px, ${edge.t.x}px, 0) rotate(${angle}rad) scale(${along * scale}, ${across * scale}) rotate(${-angle}rad)`;
      lens.style.background = `rgb(255 255 255 / ${glass * 0.035 * (1 - solid) + solid * 0.94})`;
      lens.style.boxShadow = `inset 0 0 0 1px rgb(255 255 255 / ${glass * 0.3 * (1 - solid)}), 0 0 0 1px rgb(0 0 0 / ${(glass + solid) * 0.12}), 0 8px 28px rgb(0 0 0 / ${solid * 0.22})`;
      corners.style.opacity = String(unit(weights.bracket.x));
      corners.style.transform = `scale(${1 + (1 - unit(weights.bracket.x)) * 0.25})`;
      text.style.opacity = String(unit(weights.label.x));
      text.style.color = `rgb(${ink} ${ink} ${ink})`;
      pin.style.transform = `translate3d(${px - 2.5}px, ${py - 2.5}px, 0)`;
      pin.style.opacity = String(unit(weights.dot.x) * presence);
    };

    const env = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => html.classList.toggle("reticle", env.matches);
    sync();
    env.addEventListener("change", sync);

    window.addEventListener("pointermove", mark, { passive: true });
    window.addEventListener("scroll", mark, { capture: true, passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("blur", up);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      env.removeEventListener("change", sync);
      window.removeEventListener("pointermove", mark);
      window.removeEventListener("scroll", mark, { capture: true });
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("blur", up);
      html.classList.remove("reticle", "reticle-off");
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
          className="font-mono text-[10px] leading-none font-bold tracking-[0.16em] whitespace-nowrap uppercase"
          ref={words}
          style={{ opacity: 0 }}
        />
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
  const reduced = useReducedMotion();
  return reduced ? null : <Reticle />;
}
