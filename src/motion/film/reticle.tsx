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
  corner?: number;
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
// The lens trails the hand by a breath and never snaps: the dot keeps the
// exact point, so the glass can take its time.
const FOLLOW = tune(190, 0.9);
const GRIP = tune(360, 0.96);
const HUNT = tune(130, 0.78);
const FADE = tune(170, 1);
const PRESS = tune(420, 0.62);
const TURN = 9;
// Below this every spring is where it is going, to the eye.
const STILL = 0.01;

const spring = (x = 0): Spring => ({ v: 0, x });

const IDLE: Reading = { label: "", mode: "idle", target: null };

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
    // Each style is written only when it changes, so a lens at rest, or one
    // only gliding, costs the page no style work beyond its transform.
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

    // The loop sleeps once the lens has come to rest under a still pointer,
    // and anything that could move it wakes it.
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
      // While the page glides the pointer is over the pane that shields it, so
      // nothing under it is read: the lens rests as a bead until it settles.
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
        const corner = reading.corner ?? Number.NaN;
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

      const goals: [Spring, number, Tune][] = [
        [edge.l, cx - tw / 2, travel],
        [edge.r, cx + tw / 2, travel],
        [edge.t, cy - th / 2, travel],
        [edge.b, cy + th / 2, travel],
        [radius, tr, travel],
        [weights.bead, mode === "idle" ? 1 : 0, FADE],
        [weights.bracket, shape.bracket, FADE],
        [weights.dot, shape.dot, FADE],
        [weights.glass, shape.glass, FADE],
        [weights.label, shape.label, FADE],
        [weights.solid, shape.solid, FADE],
        [weights.presence, hidden ? 0 : 1, FADE],
        [press, pressed ? 1 - Math.min(inset, 0.14) : 1, PRESS],
      ];
      owed += elapsed;
      while (owed >= STEP) {
        owed -= STEP;
        for (const [state, to, feel] of goals) pull(state, to, STEP, feel);
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

    window.addEventListener("pointermove", mark, { passive: true });
    window.addEventListener("scroll", mark, { capture: true, passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("blur", up);
    wake();

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
