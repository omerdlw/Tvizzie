interface TimelineOptions {
  after?: (ms: number, run: () => void) => () => void;
  defer?: (run: () => void) => void;
  head?: number;
  now?: () => number;
  opening: number;
  patience: number;
  stride: number;
}

export interface Ticket {
  ready: () => void;
  withdraw: () => void;
}

export interface Timeline {
  elapsed: () => number;
  pause: () => void;
  request: (
    rank: () => number,
    open: (delay: number) => void,
    hold?: boolean,
    span?: () => number,
  ) => Ticket;
  resume: () => void;
  serial: (on: boolean) => void;
  until: (at: number) => number;
}

interface Waiting {
  open: (delay: number) => void;
  rank: () => number;
  ready: boolean;
  span: (() => number) | null;
  timer: (() => void) | null;
}

export function createTimeline({
  after = (ms, run) => {
    const timer = setTimeout(run, ms);
    return () => clearTimeout(timer);
  },
  defer = (run) => void setTimeout(run, 0),
  head = 0,
  now = () => performance.now(),
  opening,
  patience,
  stride,
}: TimelineOptions): Timeline {
  const waiting = new Set<Waiting>();
  let born: number | null = null;
  let free = 0;
  let ordered = true;
  let paused = false;
  let queued = false;

  const start = () => {
    if (born === null) {
      born = now() - head * 1000;
      free = born + opening * 1000;
    }
    return born;
  };

  const flush = () => {
    queued = false;
    if (paused) return;
    const batch = [...waiting]
      .map((entry) => ({ entry, top: entry.rank() }))
      .sort((a, b) => a.top - b.top);
    for (const { entry } of batch) {
      if (ordered && !entry.ready) return;
      waiting.delete(entry);
      entry.timer?.();
      const at = now();
      const wait = ordered ? Math.max(0, free - at) : 0;
      if (ordered) {
        const length = Math.max(stride, entry.span?.() ?? 0);
        free = at + wait + length * 1000;
      }
      entry.open(wait / 1000);
    }
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    defer(flush);
  };

  return {
    elapsed: () => (now() - start()) / 1000,
    pause() {
      paused = true;
    },
    request(rank, open, hold = false, span) {
      start();
      const entry: Waiting = {
        open,
        rank,
        ready: !hold,
        span: span ?? null,
        timer: null,
      };
      if (hold) {
        entry.timer = after(patience * 1000, () => {
          entry.ready = true;
          schedule();
        });
      }
      waiting.add(entry);
      schedule();
      return {
        ready() {
          entry.ready = true;
          schedule();
        },
        withdraw() {
          entry.timer?.();
          waiting.delete(entry);
          schedule();
        },
      };
    },
    resume() {
      paused = false;
      if (waiting.size > 0) schedule();
    },
    serial(on) {
      ordered = on;
    },
    until(at) {
      return Math.max(0, at - (now() - start()) / 1000);
    },
  };
}
