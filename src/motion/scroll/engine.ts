import { cancelFrame, frame, motionValue } from "motion/react";
import { clamp } from "../math";
import { STEADY, STEADY_MIN, nextSteady } from "./steady";

const LINE_PX = 40;
const SETTLE_DISTANCE = 1.5;
const SETTLE_SPEED = 30;
const MAX_FRAME_MS = 64;
const SCROLLING_ATTRIBUTE = "data-scrolling";
const SCROLLING_LINGER_MS = 140;
const LATCH_MS = 160;
const SHIELD_Z = 90;
const GESTURE_GAP_MS = 180;
const ENVELOPE_MS = 150;
const RISE = 1.4;
const RISES = 2;
const HELD_PX = 2;
const HELD_SPEED = 80;
const DWELL_MS = 250;
const DWELL_STREAM_MS = 700;
const RESUME = 2;
const STEADY_DWELL_MS = 350;
const NEAR = 0.1;

export interface SmoothScrollOptions {
  lead?: number;
  maxSpeed?: number;
  response?: number;
  wheelMultiplier?: number;
}

interface ScrollToOptions {
  offset?: number;
  immediate?: boolean;
  duration?: number;
  glide?: number;
}

interface Glide {
  position: number;
  velocity: number;
}

function glide(
  state: Glide,
  target: number,
  dt: number,
  response: number,
): Glide {
  if (response <= 0) return { position: target, velocity: 0 };
  const omega = 1 / response;
  const offset = state.position - target;
  const push = state.velocity + omega * offset;
  const decay = Math.exp(-omega * dt);
  return {
    position: target + (offset + push * dt) * decay,
    velocity: (state.velocity - omega * push * dt) * decay,
  };
}

function wheelPixels(
  event: { deltaMode: number; deltaY: number },
  viewportHeight: number,
): number {
  if (event.deltaMode === 1) return event.deltaY * LINE_PX;
  if (event.deltaMode === 2) return event.deltaY * viewportHeight;
  return event.deltaY;
}

const easeInOutQuart = (t: number) =>
  t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;

function scrollsNatively(target: EventTarget | null, deltaY: number): boolean {
  let element = target instanceof Element ? target : null;
  while (
    element &&
    element !== document.body &&
    element !== document.documentElement
  ) {
    if (element instanceof HTMLElement) {
      if (element.hasAttribute("data-scroll-native")) return true;
      const { overflowY } = getComputedStyle(element);
      const scrolls =
        overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay";
      if (scrolls && element.scrollHeight > element.clientHeight + 1) {
        const atTop = element.scrollTop <= 0;
        const atBottom =
          element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
        if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
      }
    }
    element = element.parentElement;
  }
  return false;
}

function pageIsLocked(): boolean {
  const root = getComputedStyle(document.documentElement).overflowY;
  const body = getComputedStyle(document.body).overflowY;
  return root === "hidden" || body === "hidden" || root === "clip";
}

export class SmoothScroll {
  readonly scrollY = motionValue(0);

  private response: number;
  private wheelMultiplier: number;
  private lead: number;
  private maxSpeed: number;
  private readonly stops = new Set<() => number>();
  private gesture = {
    at: -Infinity,
    delta: 0,
    envelope: 0,
    rises: 0,
    peak: 0,
    size: 0,
    steady: 0,
  };
  private held: { at: number; since: number } | null = null;
  private leave: number | null = null;
  private pressed: { at: number; since: number } | null = null;
  private current = 0;
  private velocity = 0;
  private target = 0;
  private written = 0;
  private running = false;
  private started = false;
  private tween: {
    duration: number;
    elapsed: number;
    from: number;
    to: number;
  } | null = null;
  private reduceMotion: MediaQueryList | null = null;
  private lingering: ReturnType<typeof setTimeout> | null = null;
  private restAt = 0;
  private carried: number | null = null;
  private extent: number | null = null;
  private locked: boolean | null = null;
  private sizing: ResizeObserver | null = null;
  private locking: MutationObserver | null = null;
  private latch = {
    at: 0,
    native: false,
    sign: 0,
    target: null as EventTarget | null,
  };
  private shield: HTMLDivElement | null = null;

  constructor({
    lead = Infinity,
    maxSpeed = Infinity,
    response = 0.11,
    wheelMultiplier = 1,
  }: SmoothScrollOptions = {}) {
    this.lead = lead;
    this.maxSpeed = maxSpeed;
    this.response = response;
    this.wheelMultiplier = wheelMultiplier;
  }

  get destination(): number {
    return this.target;
  }

  get isScrolling(): boolean {
    return this.running;
  }

  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.adopt(window.scrollY);
    this.sizing = new ResizeObserver(() => {
      this.extent = null;
    });
    this.sizing.observe(document.documentElement);
    this.sizing.observe(document.body);
    this.locking = new MutationObserver(() => {
      this.locked = null;
    });
    for (const element of [document.documentElement, document.body]) {
      this.locking.observe(element, {
        attributeFilter: ["class", "style"],
        attributes: true,
      });
    }
    const shield = document.createElement("div");
    shield.setAttribute("aria-hidden", "true");
    shield.style.cssText = `position:fixed;inset:0;z-index:${SHIELD_Z};pointer-events:none;`;
    document.body.append(shield);
    this.shield = shield;
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  destroy(): void {
    if (!this.started) return;
    this.started = false;
    this.halt();
    this.rest();
    this.sizing?.disconnect();
    this.locking?.disconnect();
    this.shield?.remove();
    this.shield = null;
    window.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
  }

  resync(): void {
    if (typeof window === "undefined") return;
    this.halt();
    this.adopt(window.scrollY);
    const y = this.scrollY.get();
    this.scrollY.set(y + 0.01);
    this.scrollY.set(y);
  }

  tune({
    lead,
    maxSpeed,
    response,
    wheelMultiplier,
  }: SmoothScrollOptions): () => void {
    const previous = {
      lead: this.lead,
      maxSpeed: this.maxSpeed,
      response: this.response,
      wheelMultiplier: this.wheelMultiplier,
    };
    if (lead !== undefined) this.lead = lead;
    if (maxSpeed !== undefined) this.maxSpeed = maxSpeed;
    if (response !== undefined) this.response = response;
    if (wheelMultiplier !== undefined) this.wheelMultiplier = wheelMultiplier;
    return () => {
      this.lead = previous.lead;
      this.maxSpeed = previous.maxSpeed;
      this.response = previous.response;
      this.wheelMultiplier = previous.wheelMultiplier;
    };
  }

  stopAt(at: () => number): () => void {
    this.stops.add(at);
    return () => this.stops.delete(at);
  }

  scrollTo(
    destination: number | Element,
    {
      duration,
      glide: carried,
      immediate = false,
      offset = 0,
    }: ScrollToOptions = {},
  ): void {
    if (typeof window === "undefined") return;
    const top =
      typeof destination === "number"
        ? destination
        : destination.getBoundingClientRect().top + window.scrollY;
    const to = clamp(top + offset, 0, this.limit());

    if (immediate || this.disabled()) {
      this.halt();
      window.scrollTo({ behavior: "instant", top: to });
      this.adopt(window.scrollY);
      return;
    }
    if (!this.running) this.current = this.adoptable();
    this.carried = carried ?? null;
    this.target = to;
    this.tween =
      duration !== undefined
        ? { duration, elapsed: 0, from: this.current, to }
        : null;
    this.run();
  }

  private limit(): number {
    this.extent ??= Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    return this.extent;
  }

  private isLocked(): boolean {
    this.locked ??= pageIsLocked();
    return this.locked;
  }

  private snap(value: number): number {
    const ratio = window.devicePixelRatio || 1;
    return Math.round(value * ratio) / ratio;
  }

  private moving(): void {
    this.restAt = performance.now() + SCROLLING_LINGER_MS;
    if (this.lingering) return;
    document.documentElement.setAttribute(SCROLLING_ATTRIBUTE, "");
    if (this.shield && document.querySelector("[data-cinematic]")) {
      this.shield.style.pointerEvents = "auto";
    }
    const wait = () => {
      const left = this.restAt - performance.now();
      if (left > 0) this.lingering = setTimeout(wait, left);
      else this.rest();
    };
    this.lingering = setTimeout(wait, SCROLLING_LINGER_MS);
  }

  private rest(): void {
    if (this.lingering) clearTimeout(this.lingering);
    this.lingering = null;
    document.documentElement.removeAttribute(SCROLLING_ATTRIBUTE);
    if (this.shield) this.shield.style.pointerEvents = "none";
  }

  private scrollsInside(event: WheelEvent): boolean {
    const now = event.timeStamp;
    const latch = this.latch;
    const sign = Math.sign(event.deltaY);
    if (
      latch.target !== event.target ||
      latch.sign !== sign ||
      now - latch.at > LATCH_MS
    ) {
      latch.native = scrollsNatively(event.target, event.deltaY);
      latch.sign = sign;
      latch.target = event.target;
    }
    latch.at = now;
    return latch.native;
  }

  private adoptable(): number {
    return Math.abs(window.scrollY - this.written) > 1
      ? window.scrollY
      : this.current;
  }

  private disabled(): boolean {
    return Boolean(this.reduceMotion?.matches);
  }

  private adopt(y: number): void {
    this.velocity = 0;
    this.current = y;
    this.target = y;
    this.written = y;
    this.scrollY.set(y);
  }

  private halt(): void {
    this.tween = null;
    this.carried = null;
    if (this.running) {
      this.running = false;
      cancelFrame(this.tick);
    }
  }

  private run(): void {
    if (this.running) return;
    this.running = true;
    frame.update(this.tick, true);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
    if (this.disabled() || event.deltaY === 0) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (event.shiftKey) return;
    if (this.scrollsInside(event)) return;
    if (this.isLocked()) return;

    event.preventDefault();
    if (!this.running) this.extent = null;
    const start = this.running ? this.target : this.adoptable();
    if (!this.running) this.current = this.adoptable();
    this.tween = null;
    this.carried = null;
    const delta = wheelPixels(event, window.innerHeight) * this.wheelMultiplier;
    const gesture = this.gesture;
    const quiet = event.timeStamp - gesture.at;
    const envelope = gesture.envelope * Math.exp(-quiet / ENVELOPE_MS);
    const size = Math.abs(delta);
    const paused =
      quiet > GESTURE_GAP_MS || Math.sign(delta) !== Math.sign(gesture.delta);
    const raw = Math.abs(event.deltaY);
    const before = gesture.size;
    gesture.rises =
      size > envelope * RISE + 4 && raw > before ? gesture.rises + 1 : 0;
    gesture.peak = paused ? raw : Math.max(gesture.peak, raw);
    gesture.steady = paused
      ? 0
      : nextSteady(gesture.steady, raw, gesture.size, gesture.peak);
    const pushed = gesture.rises >= RISES;
    gesture.at = event.timeStamp;
    gesture.delta = delta;
    gesture.envelope = Math.max(size, envelope);
    gesture.size = raw;
    const pressed = this.pressed;
    if (
      gesture.steady >= STEADY &&
      pressed &&
      event.timeStamp - pressed.since >= STEADY_DWELL_MS
    ) {
      this.leave = pressed.at;
    }
    const held = this.held;
    if ((paused || pushed) && held) {
      const dwell = paused ? DWELL_MS : DWELL_STREAM_MS;
      if (event.timeStamp - held.since >= dwell) this.leave = held.at;
      gesture.rises = 0;
    }
    if (
      paused &&
      quiet >= DWELL_MS &&
      raw >= Math.max(STEADY_MIN, before * RESUME)
    ) {
      const near = NEAR * window.innerHeight;
      for (const stop of this.stops) {
        const at = stop();
        if (
          Math.abs(this.target - at) <= HELD_PX &&
          Math.abs(this.current - at) <= near
        ) {
          this.leave = at;
        }
      }
    }

    const reach = this.lead * window.innerHeight;
    let next = clamp(start + delta, this.current - reach, this.current + reach);
    let against: number | null = null;
    for (const stop of this.stops) {
      const at = stop();
      if (this.leave !== null && Math.abs(this.leave - at) <= HELD_PX) continue;
      if (this.current <= at + HELD_PX && next > at) next = at;
      else if (this.current >= at - HELD_PX && next < at) next = at;
      else continue;
      against = at;
    }
    const near = NEAR * window.innerHeight;
    if (against === null || Math.abs(this.current - against) > near) {
      this.pressed = null;
    } else if (!pressed || Math.abs(pressed.at - against) > HELD_PX) {
      this.pressed = { at: against, since: event.timeStamp };
    }
    this.target = clamp(next, 0, this.limit());
    this.run();
  };

  private readonly onScroll = (): void => {
    const y = window.scrollY;
    if (Math.abs(y - this.written) <= 1) return;
    this.halt();
    this.adopt(y);
    this.moving();
  };

  private readonly onResize = (): void => {
    this.extent = null;
    if (!this.running) this.adopt(window.scrollY);
  };

  private hold(ratio: number): void {
    if (
      this.leave !== null &&
      Math.abs(this.current - this.leave) > window.innerHeight
    ) {
      this.leave = null;
    }
    const still = Math.abs(this.velocity) * ratio < HELD_SPEED;
    let on: number | null = null;
    if (still) {
      for (const stop of this.stops) {
        const at = stop();
        if (Math.abs(this.current - at) <= HELD_PX) on = at;
      }
    }
    if (on === null) {
      this.held = null;
      return;
    }
    if (this.held && Math.abs(this.held.at - on) <= HELD_PX) return;
    this.held = { at: on, since: performance.now() };
    if (this.leave !== null && Math.abs(this.leave - on) > HELD_PX) {
      this.leave = null;
    }
  }

  private readonly tick = ({ delta }: { delta: number }): void => {
    const dt = Math.min(delta, MAX_FRAME_MS) / 1000;
    const limit = this.limit();
    this.target = clamp(this.target, 0, limit);

    let next: number;
    if (this.tween) {
      this.tween.elapsed += dt;
      const progress = clamp(this.tween.elapsed / this.tween.duration, 0, 1);
      next =
        this.tween.from +
        (this.tween.to - this.tween.from) * easeInOutQuart(progress);
      if (progress >= 1) this.tween = null;
      this.velocity = 0;
    } else {
      const state = glide(
        { position: this.current, velocity: this.velocity },
        this.target,
        dt,
        this.carried ?? this.response,
      );
      next = state.position;
      this.velocity = state.velocity;
      const fastest = this.maxSpeed * window.innerHeight;
      if (this.carried === null && Math.abs(this.velocity) > fastest) {
        this.velocity = Math.sign(this.velocity) * fastest;
        next =
          this.current +
          clamp(next - this.current, -fastest * dt, fastest * dt);
      }
    }

    const ratio = window.devicePixelRatio || 1;
    const settled =
      !this.tween &&
      Math.abs(this.target - next) * ratio < SETTLE_DISTANCE &&
      Math.abs(this.velocity) * ratio < SETTLE_SPEED;
    const bounded = clamp(next, 0, limit);
    if (bounded !== next) this.velocity = 0;
    this.current = settled ? this.target : bounded;
    if (settled) this.velocity = 0;

    const y = this.snap(this.current);
    if (y !== this.written) {
      this.written = y;
      window.scrollTo({ behavior: "instant", top: y });
      this.scrollY.set(y);
      this.moving();
    }

    if (this.stops.size > 0) this.hold(ratio);

    if (settled) {
      this.carried = null;
      this.running = false;
      cancelFrame(this.tick);
    }
  };
}
