import type { JSX } from "react";
import type { Awards, PersonDetails } from "@/infrastructure/tmdb/types";
import { PERSON_KNOWN_FOR } from "../lib/constants";
import { SIDEBAR_CLASS, SIDEBAR_FACTS_CLASS } from "../lib/layout";
import { Sequence } from "../stage";
import { calculateAge, formatDate, getFilmography } from "../lib/utils";
import { PersonViewActions } from "./person-actions";
import { PersonPortrait } from "./person-artwork";
import { PersonFacts } from "./person-facts";

export function PersonSidebar({
  awards,
  person,
}: {
  awards?: Promise<Awards | null>;
  person: PersonDetails;
}): JSX.Element {
  const knownFor = (getFilmography(person)[0]?.credits ?? [])
    .slice(0, PERSON_KNOWN_FOR)
    .map(({ id, title }) => ({ id, title }));

  return (
    <Sequence className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3" data-exit="">
        <PersonPortrait awards={awards} person={person} />
        <PersonViewActions />
      </div>

      <div className={SIDEBAR_FACTS_CLASS} data-flow="">
        <PersonFacts
          age={calculateAge(person.birthday, person.deathday)}
          aliases={person.alsoKnownAs}
          born={formatDate(person.birthday)}
          died={formatDate(person.deathday)}
          knownFor={knownFor}
          place={person.placeOfBirth}
        />
      </div>
    </Sequence>
  );
}
