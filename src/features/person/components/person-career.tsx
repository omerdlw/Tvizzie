"use client";

import { Icon } from "@/ui";
import { Career, Header, Section } from "../stage";
import type { Career as CareerData } from "../lib/types";
import { usePersonView } from "./person-view-state";

export function PersonCareer({ career }: { career: CareerData }) {
  const { openTimeline } = usePersonView();

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <button
            className="cine-fade hidden cursor-pointer items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase outline-none hover:text-white focus-visible:text-white sm:flex"
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
