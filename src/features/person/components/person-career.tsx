"use client";

import { Career, Header, Section } from "../stage";
import type { Career as CareerData } from "../lib/types";
import { usePersonView } from "./person-view-state";

export function PersonCareer({ career }: { career: CareerData }) {
  const { openTimeline } = usePersonView();

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <span className="hidden text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase sm:block">
            Taller · more widely seen
          </span>
        }
        icon="solar:chart-2-bold"
        title="Career"
      />
      <Career onOpen={openTimeline} peak={career.peak} years={career.years} />
    </Section>
  );
}
