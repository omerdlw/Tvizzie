"use client";

import { useEffect, useState, useSyncExternalStore, type JSX } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";

interface Peek {
  id: number;
  posterPath: string | null;
  title: string;
}

interface PeekState {
  posters: readonly Peek[];
  shown: number | null;
  visible: boolean;
}

const REMEMBERED = 6;
const HIDE_AFTER = 90;

let state: PeekState = { posters: [], shown: null, visible: false };
let pendingHide: ReturnType<typeof setTimeout> | null = null;
const warmed = new Set<string>();
const listeners = new Set<() => void>();

function commit(next: PeekState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function cancelHide(): void {
  if (pendingHide === null) return;
  clearTimeout(pendingHide);
  pendingHide = null;
}

export const peek = {
  hide() {
    if (pendingHide !== null || !state.visible) return;
    pendingHide = setTimeout(() => {
      pendingHide = null;
      commit({ ...state, visible: false });
    }, HIDE_AFTER);
  },
  show(next: Peek) {
    cancelHide();
    if (state.visible && state.shown === next.id) return;
    const known = state.posters.some((poster) => poster.id === next.id);
    commit({
      posters: known
        ? state.posters
        : [...state.posters, next].slice(-REMEMBERED),
      shown: next.id,
      visible: true,
    });
  },
  warm(posterPaths: readonly (string | null)[]) {
    for (const path of posterPaths) {
      if (!path || warmed.has(path)) continue;
      warmed.add(path);
      const url = tmdbImageUrl("poster", path, "w342");
      if (url) new Image().src = url;
    }
  },
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const WIDTH = 176;
const HEIGHT = 264;
const GAP = 28;
const MARGIN = 12;

function Layer({
  poster,
  shown,
}: {
  poster: Peek;
  shown: boolean;
}): JSX.Element | null {
  const [loaded, setLoaded] = useState(false);
  const src = tmdbImageUrl("poster", poster.posterPath, "w342");
  if (!src) return null;

  return (
    <img
      alt=""
      className="home-peek-layer absolute inset-0 size-full object-cover"
      data-shown={shown && loaded}
      decoding="async"
      draggable={false}
      onLoad={() => setLoaded(true)}
      src={src}
    />
  );
}

export function PointerPoster(): JSX.Element {
  const { posters, shown, visible } = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const sx = useSpring(x, { damping: 30, mass: 0.6, stiffness: 240 });
  const sy = useSpring(y, { damping: 30, mass: 0.6, stiffness: 240 });
  const lean = useTransform(useVelocity(sx), [-1600, 1600], [-8, 8]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const right = event.clientX + GAP + WIDTH > window.innerWidth - MARGIN;
      x.set(right ? event.clientX - GAP - WIDTH : event.clientX + GAP);
      y.set(
        Math.min(
          Math.max(event.clientY - HEIGHT / 2, MARGIN),
          window.innerHeight - HEIGHT - MARGIN,
        ),
      );
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  useEffect(() => {
    if (!visible) return;
    sx.jump(x.get());
    sy.jump(y.get());
  }, [sx, sy, visible, x, y]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 hidden [@media(hover:hover)]:block"
      style={{ rotate: lean, x: sx, y: sy, zIndex: Z_INDEX.DOCK_BACKDROP - 10 }}
    >
      <div
        className="home-peek relative overflow-hidden rounded-[14px] bg-black shadow-2xl ring-1 shadow-black/60 ring-white/10"
        data-visible={visible}
        style={{ height: HEIGHT, width: WIDTH }}
      >
        {posters.map((poster) => (
          <Layer key={poster.id} poster={poster} shown={poster.id === shown} />
        ))}
      </div>
    </motion.div>
  );
}
