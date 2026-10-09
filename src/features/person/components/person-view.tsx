import { Suspense, type JSX } from "react";
import { StickyAside } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { Awards, PersonDetails } from "@/infrastructure/tmdb/types";
import {
  CONTAINER_CLASS,
  COLUMNS_CLASS,
  ASIDE_CLASS,
  PAGE_CLASS,
  pageBodyClass,
} from "../lib/layout";
import { Body, Stage } from "../stage";
import {
  departmentRole,
  excerptBiography,
  getBackdropPath,
  getBackdropPaths,
  getCareer,
  getFilmography,
  getGalleryImages,
  getSocialLinks,
  getTimeline,
} from "../lib/utils";
import { PersonBackdropHero, PersonPhotoGrade } from "./person-artwork";
import { PersonAwards } from "./person-awards";
import { PersonCareer } from "./person-career";
import { PersonFilmography } from "./person-filmography";
import { PersonGallery } from "./person-gallery";
import { PersonHeader } from "./person-header";
import { PersonProjection } from "./person-projection";
import { PersonSidebar } from "./person-sidebar";
import { PersonTimeline } from "./person-timeline";
import { PersonViews } from "./person-views";

const CAREER_MIN_FILMS = 3;

export function PersonView({
  awards,
  person,
}: {
  awards: Promise<Awards | null>;
  person: PersonDetails;
}): JSX.Element {
  const backdropPath = getBackdropPath(person);
  const backdrop = tmdbImageUrl("backdrop", backdropPath, "original");
  const filmography = getFilmography(person);
  const career = getCareer(person);
  const bio = person.biography ? excerptBiography(person.biography) : null;
  const films = career?.years.reduce((sum, year) => sum + year.count, 0) ?? 0;

  return (
    <Stage className={PAGE_CLASS}>
      <PersonProjection backdrop={backdropPath} person={person} />
      <div className={CONTAINER_CLASS}>
        {backdrop ? (
          <PersonBackdropHero fallback={backdropPath} person={person} />
        ) : (
          <PersonPhotoGrade person={person} />
        )}

        <Body className={pageBodyClass(Boolean(backdrop))}>
          <div className={COLUMNS_CLASS}>
            <PersonHeader
              biography={person.biography}
              excerpt={bio?.text ?? null}
              links={getSocialLinks(person.externalIds)}
              name={person.name}
              role={departmentRole(person.knownForDepartment)}
              truncated={bio?.truncated ?? false}
            />

            <StickyAside className={ASIDE_CLASS}>
              <PersonSidebar awards={awards} person={person} />
            </StickyAside>

            <PersonViews
              views={{
                main: (
                  <>
                    {career && films >= CAREER_MIN_FILMS ? (
                      <PersonCareer career={career} />
                    ) : null}
                    {filmography.length > 0 ? (
                      <PersonFilmography groups={filmography} />
                    ) : null}
                    <PersonGallery
                      backdrops={getBackdropPaths(person)}
                      name={person.name}
                      portraits={getGalleryImages(person)}
                    />
                  </>
                ),
                timeline: <PersonTimeline years={getTimeline(person)} />,
                awards: (
                  <Suspense fallback={null}>
                    <PersonAwards awards={awards} />
                  </Suspense>
                ),
              }}
            />
          </div>
        </Body>
      </div>
    </Stage>
  );
}
