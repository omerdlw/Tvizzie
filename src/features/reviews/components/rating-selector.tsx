"use client";

import { useState, type JSX } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { Button } from "@/ui";
import { STAR_PATH } from "./rating-stars";

function fillOf(star: number, value: number | null): number {
  if (value === null) return 0;
  if (value >= star) return 24;
  if (value >= star - 0.5) return 12;
  return 0;
}

export function RatingSelector({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: number | null) => void;
  value: number | null;
}): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  const choose = (score: number) => onChange(value === score ? null : score);

  return (
    <div
      aria-label="Rating"
      className={cn("flex items-center gap-1.5", disabled && "opacity-60")}
      onMouseLeave={() => setHover(null)}
      role="group"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <div className="relative size-10 sm:size-12" key={star}>
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 size-full"
            viewBox="0 0 24 24"
          >
            <defs>
              <clipPath id={`rating-star-${star}`}>
                <rect height="24" width={fillOf(star, shown)} x="0" y="0" />
              </clipPath>
            </defs>
            <path className="fill-white/10" d={STAR_PATH} />
            <path
              className="fill-amber-400"
              clipPath={`url(#rating-star-${star})`}
              d={STAR_PATH}
            />
          </svg>
          <Button
            aria-label={`${star - 0.5} stars`}
            className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
            disabled={disabled}
            onClick={() => choose(star - 0.5)}
            onFocus={() => setHover(star - 0.5)}
            onMouseEnter={() => setHover(star - 0.5)}
          />
          <Button
            aria-label={`${star} stars`}
            className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
            disabled={disabled}
            onClick={() => choose(star)}
            onFocus={() => setHover(star)}
            onMouseEnter={() => setHover(star)}
          />
        </div>
      ))}
    </div>
  );
}
