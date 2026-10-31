import type { JSX } from "react";
import { AwardsView, type AwardsGrouping } from "@/features/awards";
import type { Awards } from "@/infrastructure/tmdb/types";
import { Beat, Header, Section } from "@/motion/stage";
import { TONE } from "@/ui";

const GROUPINGS: readonly AwardsGrouping[] = [
  "organizations",
  "projects",
  "timeline",
];

export async function PersonAwards({
  awards,
}: {
  awards: Promise<Awards | null>;
}): Promise<JSX.Element | null> {
  const resolved = await awards;
  if (!resolved || resolved.organizations.length === 0) return null;

  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:cup-star-bold" title="Awards" />
      <Beat>
        <AwardsView
          awards={resolved}
          groupings={GROUPINGS}
          look={{
            button: "rounded-full",
            logo: "rounded-[8px]",
            poster: "rounded-[6px]",
            segmented: TONE.tabs,
            select: {
              content: "rounded-[18px]",
              option: "rounded-[14px]",
              trigger:
                "rounded-full bg-white/[0.06] ring-white/[0.04] hover:bg-white/10 hover:ring-white/[0.08]",
            },
          }}
        />
      </Beat>
    </Section>
  );
}
