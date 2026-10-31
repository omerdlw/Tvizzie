"use client";

import { useMemo, useRef, useState, type JSX, type PointerEvent } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import type { ActivityDays } from "../../lib/browse-data";
import { counted } from "./section";

const DAY = 86_400_000;
const CELL = "size-[10px] rounded-[2px]";

const LEVELS = [
  "bg-white/[0.06]",
  "bg-white/15",
  "bg-white/30",
  "bg-white/55",
  "bg-white/85",
];

const MONTH = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});
const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

interface Day {
  count: number;
  date: Date;
  level: number;
}

function leveller(counts: readonly number[]): (count: number) => number {
  const active = counts.filter(Boolean).sort((a, b) => a - b);
  const at = (share: number) =>
    active[Math.floor(share * (active.length - 1))] ?? 0;
  const steps = [at(0.25), at(0.5), at(0.75)];
  return (count) =>
    count === 0 ? 0 : 1 + steps.filter((step) => count > step).length;
}

export function ActivityCalendar({
  days,
}: {
  days: ActivityDays;
}): JSX.Element {
  const { total, weeks } = useMemo(() => {
    const level = leveller(days.counts);
    const from = Date.parse(`${days.from}T00:00:00Z`);
    const weeks: { days: (Day | null)[]; month: string | null }[] = [];
    days.counts.forEach((count, index) => {
      if (index % 7 === 0) weeks.push({ days: [], month: null });
      const week = weeks[weeks.length - 1];
      const date = new Date(from + index * DAY);
      if (date.getUTCDate() === 1) week.month = MONTH.format(date);
      week.days.push({ count, date, level: level(count) });
    });
    const last = weeks[weeks.length - 1];
    while (last && last.days.length < 7) last.days.push(null);
    return {
      total: days.counts.reduce((sum, count) => sum + count, 0),
      weeks,
    };
  }, [days]);

  const frame = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    day: Day;
    x: number;
    y: number;
  } | null>(null);

  const onPointerOver = (event: PointerEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-week]",
    );
    const box = frame.current?.getBoundingClientRect();
    if (!cell || !box) return setHover(null);
    const day =
      weeks[Number(cell.dataset.week)]?.days[Number(cell.dataset.day)];
    if (!day) return setHover(null);
    const rect = cell.getBoundingClientRect();
    setHover({
      day,
      x: Math.min(
        Math.max(rect.left + rect.width / 2 - box.left, 64),
        box.width - 64,
      ),
      y: rect.top - box.top,
    });
  };

  return (
    <div className="relative flex flex-col gap-3" ref={frame}>
      <div className="flex gap-2">
        <div
          aria-hidden="true"
          className="grid shrink-0 grid-rows-[12px_repeat(7,10px)] gap-[3px] text-[9px] leading-[10px] text-white/35"
        >
          <span />
          <span>Mon</span>
          <span />
          <span>Wed</span>
          <span />
          <span>Fri</span>
        </div>
        <div
          aria-label={`${counted(total, "activity", "activities")} in the last year`}
          className="flex min-w-0 flex-1 flex-row-reverse justify-start gap-[3px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_28px)]"
          onPointerLeave={() => setHover(null)}
          onPointerOver={onPointerOver}
          role="img"
        >
          {weeks.toReversed().map((week, back) => {
            const index = weeks.length - 1 - back;
            return (
              <div className="flex shrink-0 flex-col gap-[3px]" key={index}>
                <span className="relative h-3">
                  {week.month ? (
                    <span className="absolute top-0 left-0 text-[9px] leading-3 whitespace-nowrap text-white/40">
                      {week.month}
                    </span>
                  ) : null}
                </span>
                {week.days.map((day, weekday) =>
                  day ? (
                    <span
                      className={cn(CELL, LEVELS[day.level], " hover:bg-white")}
                      data-day={weekday}
                      data-week={index}
                      key={weekday}
                    />
                  ) : (
                    <span className={CELL} key={weekday} />
                  ),
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] leading-4 text-white/40">
        <span className="tabular-nums">
          {total.toLocaleString("en-US")} in the last year
        </span>
        <span aria-hidden="true" className="flex items-center gap-[3px]">
          <span className="mr-1">Less</span>
          {LEVELS.map((level) => (
            <span className={cn(CELL, level)} key={level} />
          ))}
          <span className="ml-1">More</span>
        </span>
      </div>

      {hover ? (
        <div
          className="tooltip-content pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap select-none"
          data-state="instant-open"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <span className="tooltip-ink">
            {hover.day.count
              ? counted(hover.day.count, "activity", "activities")
              : "No activity"}
            <span className="tooltip-meta">{DATE.format(hover.day.date)}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
