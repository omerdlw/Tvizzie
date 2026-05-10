import { Suspense, use } from 'react';
import { motion } from 'framer-motion';

import PersonAwards from '@/features/person/awards';
import FilmographyCard from '@/features/person/filmography-card';
import PersonGallery from '@/features/person/gallery';
import NavHeightSpacer from '@/ui/elements/nav-height-spacer';
import PersonSidebar from '@/features/person/sidebar';
import PersonTimeline from '@/features/person/timeline';
import { MovieGridDivider, MovieGridFrame, MovieGridSidebarBoundary } from '@/features/movie/grid-animation';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { getFilmographyCredits } from '@/features/person/utils';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { cn } from '@/core/utils';
import { PersonSectionSkeleton, PersonTimelineSkeleton } from '@/features/person/skeletons';
import { getPersonRouteSectionMotion, PERSON_ROUTE_MOTION } from './motion';
import Registry from './registry';

function PersonGridSection({ children, className = '', divider = 'decorative', motionIndex = 0 }) {
  const isPlainDivider = divider === 'plain';

  return (
    <motion.section
      className={cn('movie-detail-grid-subsection', isPlainDivider && 'person-detail-plain-section', className)}
      {...getPersonRouteSectionMotion(motionIndex)}
    >
      <MovieGridDivider className={isPlainDivider ? 'person-detail-grid-divider-plain' : ''} />
      <div className="movie-detail-grid-subsection-content movie-detail-shell-inset">{children}</div>
    </motion.section>
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
  const FILMOGRAPHY_SECTION_REVEAL = Object.freeze({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: Object.freeze({
      type: 'tween',
      duration: 0.86,
    }),
  });

  const FILMOGRAPHY_TITLE_REVEAL = Object.freeze({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: Object.freeze({
      type: 'tween',
      duration: 0.82,
      delay: 0.08,
    }),
  });

  const FILMOGRAPHY_GRID_STAGGER = Object.freeze({
    initial: 'hidden',
    animate: 'visible',
    variants: Object.freeze({
      hidden: {},
      visible: Object.freeze({
        transition: Object.freeze({
          delayChildren: 0.08,
          staggerChildren: 0.1,
        }),
      }),
    }),
  });

  const FILMOGRAPHY_GRID_ITEM = Object.freeze({
    variants: Object.freeze({
      hidden: Object.freeze({ opacity: 0, y: 16, scale: 0.99 }),
      visible: Object.freeze({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: Object.freeze({
          type: 'tween',
          duration: 0.86,
        }),
      }),
    }),
  });

  return (
    <motion.section className="flex flex-col gap-3" {...FILMOGRAPHY_SECTION_REVEAL}>
      <motion.h2 className="text-xs font-semibold tracking-widest text-white/70 uppercase" {...FILMOGRAPHY_TITLE_REVEAL}>
        Filmography
      </motion.h2>

      <motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" {...FILMOGRAPHY_GRID_STAGGER}>
        {credits.map((credit, index) => (
          <motion.div key={`${credit.media_type}-${credit.id}-${credit.credit_id}`} {...FILMOGRAPHY_GRID_ITEM}>
            <FilmographyCard
              credit={credit}
              imagePriority={index < 8}
              imageFetchPriority={index < 8 ? 'high' : undefined}
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

function PersonMainContent({ person }) {
  const movieCredits = getFilmographyCredits(person, 'movie');
  const hasGallery = person?.images?.profiles?.length > 0;

  return (
    <>
      {hasGallery ? (
        <PersonGridSection divider="plain" motionIndex={0}>
          <PersonGallery images={person.images} />
        </PersonGridSection>
      ) : null}

      {movieCredits.length > 0 ? (
        <PersonGridSection divider={hasGallery ? 'decorative' : 'plain'} motionIndex={1}>
          <PersonFilmographySurface credits={movieCredits} />
        </PersonGridSection>
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
      <PersonGridSection divider="plain" motionIndex={0}>
        <PersonTimeline person={mergedPerson} />
      </PersonGridSection>
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
          baseDelay={PERSON_ROUTE_MOTION.frameBaseDelay}
          className={cn('mx-auto flex w-full flex-col gap-0 px-0', PAGE_SHELL_MAX_WIDTH_CLASS)}
        >
          <motion.div className="person-detail-grid-primary" {...getPersonRouteSectionMotion(0)}>
            <div className="movie-detail-grid-sidebar relative w-full shrink-0">
              <div className="lg:sticky lg:top-0">
                <div className="w-full">
                  <PersonSidebar person={person} age={age} />
                </div>
              </div>
            </div>

            <div className="movie-detail-grid-main relative flex w-full min-w-0 flex-col pb-0">
              <MovieGridSidebarBoundary />
              <div className="flex flex-col">
                <motion.div className="movie-detail-section-band movie-detail-shell-inset" {...getPersonRouteSectionMotion(1)}>
                  <div className="flex min-w-0 items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-zuume max-w-full text-5xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl">
                        {person.name}
                      </div>
                    </div>
                  </div>

                  {biographyExcerpt ? (
                    <p className="movie-detail-reading-measure mt-4 text-left text-base leading-7 text-white/70 sm:text-justify">
                      {biographyExcerpt}
                    </p>
                  ) : null}
                </motion.div>

                <motion.div key={`person-view-${activeView}`} {...getPersonRouteSectionMotion(2)}>
                  {activeView === 'awards' ? (
                    <PersonGridSection divider="plain" motionIndex={3}>
                      <PersonAwards personId={person.id} />
                    </PersonGridSection>
                  ) : (
                    <Suspense fallback={deferredFallback}>
                      <PersonDeferredContent
                        person={person}
                        secondaryDataPromise={secondaryDataPromise}
                        activeView={activeView}
                      />
                    </Suspense>
                  )}
                </motion.div>
              </div>
              <NavHeightSpacer className="w-full" />
            </div>
          </motion.div>
        </MovieGridFrame>
      </PageGradientShell>
    </>
  );
}
