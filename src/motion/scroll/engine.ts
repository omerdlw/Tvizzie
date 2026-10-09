import { cancelFrame, frame, motionValue } from "motion/react";

const LINE_PX = 40;
const SETTLE_DISTANCE = 1.5;
const SETTLE_SPEED = 30;
const MAX_FRAME_MS = 64;
const SCROLLING_ATTRIBUTE = "data-scrolling";
const SCROLLING_LINGER_MS = 140;

export interface SmoothScrollOptions {
  response?: number;
  wheelMultiplier?: number;
}

interface ScrollToOptions {
  offset?: number;
  immediate?: boolean;
  duration?: number;
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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

type Listener = (y: number) => void;

export class SmoothScroll {
  readonly scrollY = motionValue(0);

  private readonly response: number;
  private readonly wheelMultiplier: number;
  private readonly listeners = new Set<Listener>();
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
  private coarsePointer: MediaQueryList | null = null;
  private lingering: ReturnType<typeof setTimeout> | null = null;

  constructor({
    response = 0.11,
    wheelMultiplier = 1,
  }: SmoothScrollOptions = {}) {
    this.response = response;
    this.wheelMultiplier = wheelMultiplier;
  }

  get y(): number {
    return this.current;
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
    this.coarsePointer = window.matchMedia("(pointer: coarse)");
    this.adopt(window.scrollY);
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  destroy(): void {
    if (!this.started) return;
    this.started = false;
    this.halt();
    this.rest();
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

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  scrollTo(
    destination: number | Element,
    { duration, immediate = false, offset = 0 }: ScrollToOptions = {},
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
    this.current = this.adoptable();
    this.target = to;
    this.tween =
      duration !== undefined
        ? { duration, elapsed: 0, from: this.current, to }
        : null;
    this.run();
  }

  private limit(): number {
    return Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
  }

  private snap(value: number): number {
    const ratio = window.devicePixelRatio || 1;
    return Math.round(value * ratio) / ratio;
  }

  private moving(): void {
    if (this.lingering) clearTimeout(this.lingering);
    else document.documentElement.setAttribute(SCROLLING_ATTRIBUTE, "");
    this.lingering = setTimeout(() => this.rest(), SCROLLING_LINGER_MS);
  }

  private rest(): void {
    if (this.lingering) clearTimeout(this.lingering);
    this.lingering = null;
    document.documentElement.removeAttribute(SCROLLING_ATTRIBUTE);
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
    if (scrollsNatively(event.target, event.deltaY)) return;
    if (pageIsLocked()) return;

    event.preventDefault();
    const start = this.running ? this.target : this.adoptable();
    if (!this.running) this.current = this.adoptable();
    this.tween = null;
    this.target = clamp(
      start + wheelPixels(event, window.innerHeight) * this.wheelMultiplier,
      0,
      this.limit(),
    );
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
    if (!this.running) this.adopt(window.scrollY);
  };

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
        this.response,
      );
      next = state.position;
      this.velocity = state.velocity;
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
      this.listeners.forEach((listener) => listener(y));
    }

    if (settled) {
      this.running = false;
      cancelFrame(this.tick);
    }
  };
}
