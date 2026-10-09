import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PersonPageChrome,
  PersonView,
  PersonViewProvider,
  describePerson,
  getTimeline,
  parsePersonId,
} from "@/features/person";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import {
  getPersonAwards,
  getPersonDetails,
} from "@/infrastructure/tmdb/server";
import { project } from "@config/project";

export interface PersonPageProps {
  params: Promise<{ id: string }>;
}

const DESCRIPTION_LIMIT = 200;

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  const id = parsePersonId((await params).id);
  const result = id === null ? null : await getPersonDetails(id);
  if (!result?.success) return { title: `Person · ${project.name}` };

  const person = result.data;
  const description = truncate(
    person.biography ??
      (describePerson(person) || `${person.name} on ${project.name}`),
    DESCRIPTION_LIMIT,
  );
  const photo = tmdbImageUrl("profile", person.profilePath, "h632");

  return {
    description,
    openGraph: {
      description,
      images: photo ? [{ url: photo }] : [],
      title: person.name,
      type: "profile",
    },
    title: person.name,
    twitter: {
      card: photo ? "summary_large_image" : "summary",
      description,
      images: photo ? [photo] : [],
      title: person.name,
    },
  };
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

  return (
    <PersonViewProvider
      awards={awards}
      hasTimeline={getTimeline(result.data).length > 0}
      key={id}
    >
      <PersonPageChrome person={result.data} />
      <PersonView awards={awards} person={result.data} />
    </PersonViewProvider>
  );
}
