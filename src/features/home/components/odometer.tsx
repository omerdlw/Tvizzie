"use client";

import { useState, type CSSProperties, type JSX } from "react";

// Readouts that change as fast as the scroll does. Each is a drum: every
// value it can show has its own place on it, and changing the value turns the
// drum the short way round. However fast it turns, there is only ever one of
// each value, so nothing piles up mid-change.

const MASK =
  "[mask-image:linear-gradient(to_bottom,transparent,black_24%,black_76%,transparent)]";

export function Drum({
  align = "start",
  className = "",
  index,
  items,
}: {
  align?: "center" | "end" | "start";
  className?: string;
  index: number;
  items: readonly string[];
}): JSX.Element {
  const count = items.length;
  const at = ((index % count) + count) % count;

  return (
    <span
      className={`relative inline-grid overflow-hidden py-[0.12em] [perspective:12em] ${MASK} ${
        align === "end"
          ? "justify-items-end"
          : align === "center"
            ? "justify-items-center"
            : "justify-items-start"
      } ${className}`}
    >
      <span className="sr-only">{items[at]}</span>
      {items.map((item, i) => {
        let away = i - at;
        if (away > count / 2) away -= count;
        if (away < -count / 2) away += count;
        const here = away === 0;
        return (
          <span
            key={i}
            aria-hidden
            className="[grid-area:1/1] transition-[transform,opacity,filter] duration-cinematic ease-out-quint"
            style={{
              filter: here ? "blur(0px)" : "blur(3px)",
              opacity: here ? 1 : 0,
              transform: `translateY(${away * 110}%) rotateX(${away * -40}deg)`,
            }}
          >
            {item}
          </span>
        );
      })}
    </span>
  );
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

// A number as a row of digit drums. Places it does not need fold away,
// unless it is padded.
export function Count({
  className = "",
  pad = false,
  places = 3,
  value,
  width = "0.62em",
}: {
  className?: string;
  pad?: boolean;
  places?: number;
  value: number;
  // Of one digit, in the face it is set in.
  width?: string;
}): JSX.Element {
  const digits = String(Math.max(0, Math.round(value))).padStart(places, "0");
  const used = String(Math.max(0, Math.round(value))).length;

  return (
    <span className={`inline-flex tabular-nums ${className}`}>
      <span className="sr-only">{value}</span>
      {digits.split("").map((digit, place) => {
        const needed = pad || place >= places - used;
        return (
          <span
            key={place}
            aria-hidden
            className="inline-flex justify-center overflow-hidden transition-[width,opacity] duration-slow ease-out-quint"
            style={
              {
                opacity: needed ? 1 : 0,
                width: needed ? width : "0em",
              } as CSSProperties
            }
          >
            <Drum align="center" index={Number(digit)} items={DIGITS} />
          </span>
        );
      })}
    </span>
  );
}

// Words that change too seldom to deserve a drum: the new one rises in as the
// old one leaves, and only the latest pair is ever on screen.
export function Ticker({
  className = "",
  direction,
  value,
}: {
  className?: string;
  direction: number;
  value: string;
}): JSX.Element {
  const [shown, setShown] = useState({ change: 0, now: value, was: "" });
  if (shown.now !== value) {
    setShown({ change: shown.change + 1, now: value, was: shown.now });
  }
  const way = direction >= 0 ? 1 : -1;

  return (
    <span className={`relative inline-grid overflow-hidden ${className}`}>
      <span
        key={`now-${shown.change}`}
        className={`[grid-area:1/1] ${shown.change > 0 ? "home-ticker-in" : ""}`}
        style={{ "--from": `${way * 0.7}em` } as CSSProperties}
      >
        {shown.now}
      </span>
      {shown.was ? (
        <span
          key={`was-${shown.change}`}
          aria-hidden
          className="home-ticker-out [grid-area:1/1]"
          style={{ "--to": `${way * -0.7}em` } as CSSProperties}
        >
          {shown.was}
        </span>
      ) : null}
    </span>
  );
}
