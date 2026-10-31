import type { JSX } from "react";
import { Item, Section } from "@/motion/stage";
import { TONE } from "@/ui";
import { whole } from "../lib/format";
import type { Pulse } from "../lib/types";

// The week in figures, set like the profile's: small caps over the number,
// hairlines between.
export function HomePulse({
  greeting,
  pulse,
}: {
  greeting: string | null;
  pulse: Pulse;
}): JSX.Element | null {
  if (pulse.members === 0) return null;
  const figures = [
    { label: "Films logged", value: pulse.logs },
    { label: "Different films", value: pulse.films },
    { label: "Reviews written", value: pulse.reviews },
    { label: "Members", value: pulse.members },
  ];
  return (
    <Section className="flex w-full flex-col gap-5">
      <Item className="flex flex-col gap-1" from="light">
        <h2 className="text-lg font-semibold text-white">
          {greeting ?? "This week on Guffin"}
        </h2>
        <p className="text-sm text-white/50">
          {greeting
            ? "Here’s what your circle and the community have been watching."
            : "A film diary for people who love them. Here’s the last seven days."}
        </p>
      </Item>
      <Item
        as="div"
        className={`grid grid-cols-2 divide-white/[0.06] sm:grid-cols-4 sm:divide-x [&>div]:py-3 sm:[&>div]:px-6 sm:[&>div:first-child]:pl-0`}
        from="light"
      >
        {figures.map((figure) => (
          <div className="flex flex-col gap-1.5" key={figure.label}>
            <span className={`${TONE.label} text-white/45`}>
              {figure.label}
            </span>
            <span className="font-zuume text-4xl leading-none font-bold text-white tabular-nums sm:text-5xl">
              {whole(figure.value)}
            </span>
          </div>
        ))}
      </Item>
    </Section>
  );
}
