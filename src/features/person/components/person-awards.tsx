import type { JSX } from "react";
import { AwardsView, type AwardsGrouping } from "@/features/awards";
import type { Awards } from "@/infrastructure/tmdb/types";
import { Beat, Header, Section } from "../stage";

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
        <AwardsView awards={resolved} groupings={GROUPINGS} />
      </Beat>
    </Section>
  );
}
