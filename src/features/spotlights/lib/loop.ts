export interface Loop {
  dispose(): void;
  /** Asks for frames again after the scene went to sleep. */
  wake(): void;
}

// A render loop that sleeps: `step` returns whether the scene still moves,
// and a still scene costs nothing until something wakes it. Hidden tabs
// never draw.
export function createLoop(step: (now: number, dt: number) => boolean): Loop {
  let frame = 0;
  let last = 0;
  let disposed = false;

  const tick = (now: number) => {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    if (step(now / 1000, dt)) frame = requestAnimationFrame(tick);
    else last = 0;
  };

  const wake = () => {
    if (disposed || frame || document.hidden) return;
    frame = requestAnimationFrame(tick);
  };

  document.addEventListener("visibilitychange", wake);
  wake();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", wake);
    },
    wake,
  };
}

/** Critically damped approach: moves `from` toward `to` over ~`time` s. */
export const approach = (from: number, to: number, time: number, dt: number) =>
  to + (from - to) * Math.exp(-dt / Math.max(1e-4, time / 4));
