import type { JSX } from "react";
import { AwardsView } from "@/features/awards";
import { Beat, Header, Section } from "@/motion/stage";
import type { Awards } from "@/infrastructure/tmdb/types";
import { AwardsAction } from "./movie-collection-actions";
import { TONE } from "@/ui";

type AwardsRequest = Promise<Awards | null>;

const hasAwards = (awards: Awards | null): awards is Awards =>
  awards !== null && awards.organizations.length > 0;

export async function MovieAwards({
  awards,
}: {
  awards: AwardsRequest;
}): Promise<JSX.Element | null> {
  const resolved = await awards;
  if (!hasAwards(resolved)) return null;

  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:cup-star-bold" title="Awards" />
      <Beat from="light">
        <AwardsView
          awards={resolved}
          groupings={["organizations", "timeline"]}
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
          showRecipients
        />
      </Beat>
    </Section>
  );
}

export async function MovieAwardsAction({
  awards,
}: {
  awards: AwardsRequest;
}): Promise<JSX.Element | null> {
  if (!hasAwards(await awards)) return null;
  return <AwardsAction />;
}
