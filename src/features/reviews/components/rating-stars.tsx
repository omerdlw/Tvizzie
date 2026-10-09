import type { JSX } from "react";
import { cn } from "@omerdlw/base-framework/utils";

export const STAR_PATH =
  "M12.74 3.98 L14.26 8.05 Q14.47 8.60 15.06 8.63 L19.40 8.82 Q21.51 8.91 19.85 10.23 L16.45 12.93 Q15.99 13.30 16.15 13.87 L17.31 18.05 Q17.88 20.09 16.12 18.92 L12.49 16.53 Q12 16.20 11.51 16.53 L7.88 18.92 Q6.12 20.09 6.69 18.05 L7.85 13.87 Q8.01 13.30 7.55 12.93 L4.15 10.23 Q2.49 8.91 4.60 8.82 L8.94 8.63 Q9.53 8.60 9.74 8.05 L11.26 3.98 Q12 2 12.74 3.98Z";

export function Star({
  className,
  fill,
  size = 13,
}: {
  className?: string;
  fill: number;
  size?: number;
}): JSX.Element {
  const lit = fill >= 0.5;
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex shrink-0", className)}
      style={{ height: size, width: size }}
    >
      <svg className="absolute inset-0 fill-white/15" viewBox="0 0 24 24">
        <path d={STAR_PATH} />
      </svg>
      {lit ? (
        <svg
          className="absolute inset-0 fill-amber-400"
          style={fill >= 1 ? undefined : { clipPath: "inset(0 50% 0 0)" }}
          viewBox="0 0 24 24"
        >
          <path d={STAR_PATH} />
        </svg>
      ) : null}
    </span>
  );
}

export function RatingStars({
  className,
  rating,
  size = 13,
}: {
  className?: string;
  rating: number | null;
  size?: number;
}): JSX.Element {
  if (rating === null || !Number.isFinite(rating) || rating <= 0) {
    return (
      <span aria-label="No rating" className="text-white/40">
        —
      </span>
    );
  }

  const value = Math.min(5, Math.max(0, rating));
  return (
    <span
      aria-label={`${value} out of 5`}
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      title={`${value} out of 5`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const fill = value - index;
        return <Star fill={fill} key={index} size={size} />;
      })}
    </span>
  );
}
