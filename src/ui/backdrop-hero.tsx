"use client";

import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { primitivesTheme } from "./theme";
import { BackdropHeroProps } from "./types";

const alphaColor = (color: string, percent: number): string =>
  percent === 100
    ? color
    : `color-mix(in srgb, ${color} ${percent}%, transparent)`;

const SIDE_COVER: readonly [number, number][] = [
  [0, 100],
  [2, 97],
  [5, 90],
  [8, 79],
  [12, 64],
  [16, 47],
  [20, 30],
  [24, 15],
  [27, 4],
  [30, 0],
];

const BOTTOM_COVER: readonly [number, number][] = [
  [0, 0],
  [28, 0],
  [38, 3],
  [48, 10],
  [58, 22],
  [68, 42],
  [78, 68],
  [88, 88],
  [95, 98],
  [100, 100],
];

const mirror = (stops: readonly [number, number][]) =>
  stops.map(([at, cover]) => [100 - at, cover] as const).reverse();

function fade(at: (cover: number) => string): string[] {
  const stops = (list: readonly (readonly [number, number])[]) =>
    list.map(([position, cover]) => `${at(cover)} ${position}%`).join(", ");
  return [
    `linear-gradient(to right, ${stops([...SIDE_COVER, ...mirror(SIDE_COVER.slice(0, -1))])})`,
    `linear-gradient(to bottom, ${stops(BOTTOM_COVER)})`,
  ];
}

export const BACKDROP_HERO_MASK = {
  maskComposite: "intersect",
  maskImage: fade((cover) => `rgb(0 0 0 / ${(100 - cover) / 100})`).join(", "),
  WebkitMaskComposite: "source-in",
  WebkitMaskImage: fade((cover) => `rgb(0 0 0 / ${(100 - cover) / 100})`).join(
    ", ",
  ),
} as const;

function getBackdropHeroGradient(color = "var(--black, #000)"): string {
  return fade((cover) => alphaColor(color, cover)).join(", ");
}

function BackdropHero({
  className,
  color,
  gradientClassName,
  gradientStyle,
  image,
  imageClassName,
  position = "center 20%",
}: BackdropHeroProps) {
  const theme = useTheme(primitivesTheme);

  if (!image) return null;

  return (
    <div aria-hidden="true" className={cn(theme.slots.backdropHero, className)}>
      <div
        className={cn(theme.slots.backdropHeroImage, imageClassName)}
        style={{
          backgroundColor: color,
          backgroundImage: `url(${image})`,
          backgroundPosition: position,
          ...(color ? undefined : BACKDROP_HERO_MASK),
        }}
      />
      {color ? (
        <div
          className={cn(theme.slots.backdropHeroGradient, gradientClassName)}
          style={{
            background: getBackdropHeroGradient(color),
            ...gradientStyle,
          }}
        />
      ) : null}
    </div>
  );
}

BackdropHero.displayName = "BackdropHero";

function BackdropHeroSkeleton({ className }: { className?: string }) {
  const theme = useTheme(primitivesTheme);

  return (
    <div aria-hidden="true" className={cn(theme.slots.backdropHero, className)}>
      <div
        className="skeleton-block absolute inset-0 rounded-none"
        style={BACKDROP_HERO_MASK}
      />
    </div>
  );
}

export { BackdropHero, BackdropHeroSkeleton };
