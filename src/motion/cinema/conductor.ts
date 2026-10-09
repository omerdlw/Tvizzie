interface ConductorClock {
  after: (ms: number, run: () => void) => () => void;
  now: () => number;
}

export interface GateOptions {
  lead: () => number;
  open: (delay: number) => void;
  order: () => number;
}

export interface Gate {
  request: () => void;
  withdraw: () => void;
  extend: (until: number) => void;
  dismiss: () => void;
  leave: () => void;
}

export interface Conductor {
  join: (options: GateOptions) => Gate;
  pause: () => void;
  resume: () => void;
  setHandoff: (handoff: number) => void;
  setSerial: (serial: boolean) => void;
  start: () => void;
  stop: () => void;
}

const FLOOR_MS = 450;
const GRACE_MS = 700;

const REAL_CLOCK: ConductorClock = {
  after: (ms, run) => {
    const timer = setTimeout(run, ms);
    return () => clearTimeout(timer);
  },
  now: () => performance.now(),
};

interface Entry {
  openedAt: number;
  options: GateOptions;
  startsAt: number;
  state: "idle" | "open" | "waiting";
  until: number;
}

export function createConductor(clock: ConductorClock = REAL_CLOCK): Conductor {
  const waiting = new Set<Entry>();
  const stage = new Set<Entry>();
  let paused = false;
  let serial = true;
  let handoff = 1;
  let stopped = false;
  let armed: { at: number; cancel: () => void } | null = null;

  const disarm = () => {
    armed?.cancel();
    armed = null;
  };

  const arm = (at: number) => {
    if (stopped || paused) return;
    if (armed && armed.at <= at) return;
    disarm();
    const cancel = clock.after(Math.max(0, at - clock.now()), () => {
      armed = null;
      pump();
    });
    armed = { at, cancel };
  };

  const busyUntil = (now: number) => {
    let until = 0;
    for (const entry of stage) {
      const free =
        entry.startsAt +
        Math.max(FLOOR_MS, (entry.until - entry.startsAt) * handoff);
      if (free <= now || entry.until <= now) stage.delete(entry);
      else until = Math.max(until, free);
    }
    return until;
  };

  const release = (entry: Entry, lead: number, now: number) => {
    waiting.delete(entry);
    entry.state = "open";
    entry.openedAt = now;
    entry.startsAt = now + lead * 1000;
    entry.until = entry.startsAt + FLOOR_MS;
    stage.add(entry);
    entry.options.open(lead);
  };

  function pump() {
    if (stopped || paused || waiting.size === 0) return;
    const now = clock.now();

    for (const entry of [...waiting]) {
      const lead = entry.options.lead();
      if (lead > 0) release(entry, lead, now);
    }

    while (waiting.size > 0) {
      const busy = serial ? busyUntil(now) : 0;
      if (now < busy) return arm(busy);
      let next: Entry | null = null;
      let top = Infinity;
      for (const entry of waiting) {
        const order = entry.options.order();
        if (order < top || next === null) {
          next = entry;
          top = order;
        }
      }
      if (next) release(next, 0, now);
    }
  }

  return {
    join(options) {
      const entry: Entry = {
        openedAt: 0,
        options,
        startsAt: 0,
        state: "idle",
        until: 0,
      };
      return {
        dismiss() {
          if (entry.state !== "open") return;
          entry.until = 0;
          stage.delete(entry);
          arm(clock.now());
        },
        extend(until) {
          if (entry.state !== "open") return;
          if (clock.now() > entry.openedAt + GRACE_MS) return;
          entry.until = Math.max(entry.until, until);
        },
        leave() {
          waiting.delete(entry);
          stage.delete(entry);
        },
        request() {
          if (entry.state !== "idle") return;
          entry.state = "waiting";
          waiting.add(entry);
          arm(clock.now());
        },
        withdraw() {
          if (entry.state !== "waiting") return;
          entry.state = "idle";
          waiting.delete(entry);
        },
      };
    },
    pause() {
      paused = true;
      disarm();
    },
    resume() {
      paused = false;
      arm(clock.now());
    },
    setHandoff(next) {
      handoff = Math.min(1, Math.max(0, next));
      arm(clock.now());
    },
    setSerial(next) {
      serial = next;
      arm(clock.now());
    },
    start() {
      stopped = false;
      arm(clock.now());
    },
    stop() {
      stopped = true;
      disarm();
    },
  };
}
