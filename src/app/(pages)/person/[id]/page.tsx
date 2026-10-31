import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PersonPageChrome,
  PersonView,
  PersonViewProvider,
  describePerson,
  getBackdropPath,
  getTimeline,
  parsePersonId,
  personSwatch,
} from "@/features/person";
import { getAmbientPalette } from "@/infrastructure/tmdb/ambient";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import {
  getPersonAwards,
  getPersonDetails,
} from "@/infrastructure/tmdb/server";
import { project, shareMetadata } from "@/config/project";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  const id = parsePersonId((await params).id);
  const result = id === null ? null : await getPersonDetails(id);
  if (!result?.success) return { title: `Person · ${project.name}` };

  const person = result.data;
  return shareMetadata({
    description:
      person.biography ??
      (describePerson(person) || `${person.name} on ${project.name}`),
    image: tmdbImageUrl("profile", person.profilePath, "h632"),
    title: person.name,
    type: "profile",
  });
}

export default async function PersonPage({
  params,
}: PersonPageProps): Promise<JSX.Element> {
  const id = parsePersonId((await params).id);
  if (id === null) notFound();

  const result = await getPersonDetails(id);
  if (!result.success) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(`Person ${id} is unavailable (${result.error.kind})`);
  }

  const awards = getPersonAwards(id).then((outcome) =>
    outcome.success ? outcome.data : null,
  );
  const palette = await getAmbientPalette(
    personSwatch(getBackdropPath(result.data), result.data.profilePath),
  );

  return (
    <PersonViewProvider
      awards={awards}
      hasTimeline={getTimeline(result.data).length > 0}
      key={id}
    >
      <PersonPageChrome palette={palette} person={result.data} />
      <PersonView awards={awards} person={result.data} />
    </PersonViewProvider>
  );
}
