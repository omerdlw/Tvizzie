"use client";

import { Icon, TONE } from "@/ui";
import { Header, Section } from "@/motion/stage";
import { Career } from "./career-chart";
import type { Career as CareerData } from "../lib/types";
import { usePersonView } from "./person-view-state";

export function PersonCareer({ career }: { career: CareerData }) {
  const { openTimeline } = usePersonView();

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <button
            className={`cine-fade hidden cursor-pointer items-center gap-1.5 ${TONE.label} text-white/50 hover:text-white focus-visible:text-white sm:flex`}
            onClick={() => openTimeline(career.peak)}
            type="button"
          >
            In the timeline
            <Icon icon="solar:alt-arrow-right-linear" size={14} />
          </button>
        }
        icon="solar:chart-2-bold"
        title="Career"
      />
      <Career onOpen={openTimeline} peak={career.peak} years={career.years} />
    </Section>
  );
}
