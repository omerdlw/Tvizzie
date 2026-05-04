import { Suspense, use } from 'react';

import PersonAwards from '@/features/person/awards';
import FilmographyCard from '@/features/person/filmography-card';
import PersonGallery from '@/features/person/gallery';
import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import PersonSidebar from '@/features/person/sidebar';
import PersonTimeline from '@/features/person/timeline';
import { MovieGridDivider, MovieGridFrame, MovieGridSidebarBoundary } from '@/features/movie/grid-animation';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { getFilmographyCredits } from '@/features/person/utils';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PersonSectionSkeleton, PersonTimelineSkeleton } from '@/ui/skeletons/views/person';
import Registry from './registry';

function PersonGridSection({ children, className = '', divider = 'decorative' }) {
  const isPlainDivider = divider === 'plain';

  return (
    <div
      className={`movie-detail-grid-subsection ${isPlainDivider ? 'person-detail-plain-section' : ''} ${className}`}
    >
      <MovieGridDivider className={isPlainDivider ? 'person-detail-grid-divider-plain' : ''} />
      <div className="movie-detail-grid-subsection-content movie-detail-shell-inset">
        {children}
      </div>
    </div>
  );
}

function getBiographyExcerpt(biography, maxLength = 280) {
  const value = String(biography || '').trim();

  if (!value) {
    return null;
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
}

function PersonFilmographySurface({ credits }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-widest text-white/70 uppercase">Filmography</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {credits.map((credit, index) => {
          return (
            <div key={`${credit.media_type}-${credit.id}-${credit.credit_id}`}>
              <FilmographyCard
                credit={credit}
                imagePriority={index < 8}
                imageFetchPriority={index < 8 ? 'high' : undefined}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PersonMainContent({ person }) {
  const movieCredits = getFilmographyCredits(person, 'movie');
  const hasGallery = person?.images?.profiles?.length > 0;

  return (
    <>
      {hasGallery ? (
        <div className="w-full">
          <PersonGridSection divider="plain">
            <PersonGallery images={person.images} />
          </PersonGridSection>
        </div>
      ) : null}

      {movieCredits.length > 0 ? (
        <div className="w-full">
          <PersonGridSection divider={hasGallery ? 'decorative' : 'plain'}>
            <PersonFilmographySurface credits={movieCredits} />
          </PersonGridSection>
        </div>
      ) : null}
    </>
  );
}

function PersonDeferredContent({ person, secondaryDataPromise, activeView }) {
  const secondaryPerson = use(secondaryDataPromise);
  const mergedPerson = {
    ...person,
    ...secondaryPerson,
  };

  if (activeView === 'timeline') {
    return (
      <div className="w-full">
        <PersonGridSection divider="plain">
          <PersonTimeline person={mergedPerson} />
        </PersonGridSection>
      </div>
    );
  }

  return <PersonMainContent person={mergedPerson} />;
}

export default function PersonView({
  person,
  secondaryDataPromise,
  activeView,
  setActiveView,
  age,
  backgroundImage,
  onSetPersonPoster,
  onResetPersonPoster,
  canResetPersonPoster,
}) {
  if (!person) return null;

  const biographyExcerpt = getBiographyExcerpt(person.biography);
  const deferredFallback =
    activeView === 'timeline' ? (
      <PersonTimelineSkeleton className="mt-10" />
    ) : (
      <PersonSectionSkeleton className="mt-10" />
    );

  return (
    <>
      <Registry
        person={person}
        activeView={activeView}
        setActiveView={setActiveView}
        age={age}
        backgroundImage={backgroundImage}
        onSetPersonPoster={onSetPersonPoster}
        onResetPersonPoster={onResetPersonPoster}
        canResetPersonPoster={canResetPersonPoster}
      />

      <PageGradientShell className="overflow-hidden" contentClassName="movie-detail-grid-content">
        <MovieGridFrame
          routeKey={`person-${person.id}`}
          className={`mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`}
        >
          <div className="person-detail-grid-primary">
            <div className="movie-detail-grid-sidebar relative w-full shrink-0">
              <div className="lg:sticky lg:top-0">
                <div className="w-full">
                  <PersonSidebar person={person} age={age} />
                </div>
              </div>
            </div>

            <div className="movie-detail-grid-main relative flex w-full min-w-0 flex-col">
              <MovieGridSidebarBoundary />
              <div className="flex w-full flex-col">
                <div className="movie-detail-section-band movie-detail-shell-inset">
                  <div className="w-full">
                    <div className="flex min-w-0 items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className="font-zuume max-w-full text-5xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl"
                        >
                          {person.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  {biographyExcerpt ? (
                    <div className="mt-4 w-full">
                      <div className="w-full">
                        <p className="movie-detail-reading-measure text-left text-base leading-7 text-white/70 sm:text-justify">
                          {biographyExcerpt}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div key={`person-view-${activeView}`}>
                  {activeView === 'awards' ? (
                    <div className="w-full">
                      <PersonGridSection divider="plain">
                        <PersonAwards personId={person.id} />
                      </PersonGridSection>
                    </div>
                  ) : (
                    <Suspense fallback={deferredFallback}>
                      <PersonDeferredContent
                        person={person}
                        secondaryDataPromise={secondaryDataPromise}
                        activeView={activeView}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
              <NavHeightSpacer className="w-full" />
            </div>
          </div>
        </MovieGridFrame>
      </PageGradientShell>
    </>
  );
}
