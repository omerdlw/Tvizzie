"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { SCENE, careerGap } from "../lib/motion";
import type { CareerYear } from "../lib/types";
import { EASE } from "../lib/tempo";
import { useCue } from "./cue";
import { Cascade, Item, Trace } from "./section";

function labelStep(count: number) {
  const steps = [1, 2, 5, 10, 20, 50];
  return steps.find((step) => Math.ceil(count / step) <= 9) ?? 50;
}

const SLOT = "relative min-w-[3px] max-w-7 flex-1";

function Light() {
  const { delay, shown } = useCue<HTMLSpanElement>({
    step: SCENE.section.lead + SCENE.career.peak.at,
  });
  return (
    <motion.span
      animate={shown ? { opacity: 1 } : undefined}
      aria-hidden="true"
      className="absolute inset-0 rounded-t-[3px] bg-[rgb(var(--grade))] shadow-[0_0_28px_rgb(var(--grade)/0.5)]"
      initial={{ opacity: 0 }}
      transition={{
        delay,
        duration: SCENE.career.peak.run,
        ease: EASE.expo,
      }}
    />
  );
}

function Roll({ year }: { year: number }) {
  const reduced = useReducedMotion();
  const shown = useMotionValue(year);
  const text = useTransform(shown, (value) => `${Math.round(value)}`);

  useEffect(() => {
    if (reduced) {
      shown.set(year);
      return;
    }
    const controls = animate(shown, year, {
      duration: SCENE.career.readout,
      ease: EASE.expo,
    });
    return () => controls.stop();
  }, [reduced, shown, year]);

  return <motion.span>{text}</motion.span>;
}

const MAX_TITLES = 3;

export function Career({
  onOpen,
  peak,
  years,
}: {
  onOpen: (year: number) => void;
  peak: number;
  years: readonly CareerYear[];
}) {
  const [active, setActive] = useState(peak);
  const gap = careerGap(years.length);
  const step = labelStep(years.length);
  const current = years.find((item) => item.year === active) ?? years[0];
  const hidden = Math.max(0, current.films.length - MAX_TITLES);

  const choose = (item: CareerYear, event: MouseEvent<HTMLButtonElement>) => {
    const { pointerType } = event.nativeEvent as unknown as {
      pointerType?: string;
    };
    if (pointerType === "touch" || pointerType === "pen") return;
    onOpen(item.year);
  };

  return (
    <div onPointerLeave={() => setActive(peak)}>
      <Cascade className="flex flex-col gap-5" gap={gap}>
        <Item className="flex min-h-14 items-end gap-6">
          <div className="flex min-w-0 items-end gap-5">
            <span className="font-zuume text-5xl leading-[0.8] font-bold text-white tabular-nums sm:text-6xl">
              <Roll year={current.year} />
            </span>
            <span className="flex min-w-0 flex-col gap-1 pb-0.5">
              <span className="text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase">
                {current.year === peak ? "Peak · " : ""}
                {current.count === 0
                  ? "No films"
                  : current.count === 1
                    ? "1 film"
                    : `${current.count} films`}
              </span>
              <span className="truncate text-sm leading-5 font-medium text-white/70">
                {current.films.slice(0, MAX_TITLES).join(" · ") || " "}
                {hidden > 0 ? (
                  <span className="text-white/50"> · +{hidden}</span>
                ) : null}
              </span>
            </span>
          </div>
        </Item>

        <div
          aria-label="Films by year"
          className="relative flex h-40 items-end gap-[3px] sm:h-48"
          role="group"
        >
          <Trace
            axis="x"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-white/10"
          />
          {years.map((item) => (
            <Item
              className={cn(SLOT, "flex h-full items-end origin-bottom")}
              from="grow"
              key={item.year}
            >
              {item.count > 0 ? (
                <button
                  aria-label={`${item.year}: ${item.count} ${item.count === 1 ? "film" : "films"}, ${item.films[0]}`}
                  className="group flex h-full w-full cursor-pointer items-end outline-none"
                  onClick={(event) => choose(item, event)}
                  onFocus={() => setActive(item.year)}
                  onPointerEnter={() => setActive(item.year)}
                  type="button"
                >
                  <span
                    className={cn(
                      "cine-fade relative block w-full rounded-t-[3px] group-focus-visible:bg-white",
                      item.year === active ? "bg-white" : "bg-white/25",
                    )}
                    style={{ height: `${Math.max(item.weight, 0.05) * 100}%` }}
                  >
                    {item.year === peak ? <Light /> : null}
                  </span>
                </button>
              ) : (
                <span
                  aria-hidden="true"
                  className="block h-0.5 w-full rounded-full bg-white/10"
                />
              )}
            </Item>
          ))}
        </div>

        <Item className="-mt-3 flex h-4 gap-[3px]" from="up">
          {years.map((item) => (
            <span aria-hidden="true" className={SLOT} key={item.year}>
              {item.year % step === 0 ? (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[11px] font-semibold tracking-[0.12em] text-white/50 tabular-nums">
                  {item.year}
                </span>
              ) : null}
            </span>
          ))}
        </Item>
      </Cascade>
    </div>
  );
}
