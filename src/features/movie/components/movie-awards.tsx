import type { JSX } from "react";
import { AwardsView } from "@/features/awards";
import { Beat, Header, Section } from "../stage";
import type { Awards } from "@/infrastructure/tmdb/types";
import { AwardsAction } from "./movie-collection-actions";

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
      <Beat>
        <AwardsView
          awards={resolved}
          groupings={["organizations", "timeline"]}
          showRecipients
        />
      </Beat>
    </Section>
  );
}

export async function MovieAwardsAction({
  awards,
  order,
}: {
  awards: AwardsRequest;
  order: number;
}): Promise<JSX.Element | null> {
  if (!hasAwards(await awards)) return null;
  return <AwardsAction order={order} />;
}
