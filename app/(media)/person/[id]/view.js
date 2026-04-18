import { Suspense, use } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PersonAwards from '@/features/person/awards';
import FilmographyCard from '@/features/person/filmography-card';
import PersonGallery from '@/features/person/gallery';
import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import PersonSidebar from '@/features/person/sidebar';
import PersonTimeline from '@/features/person/timeline';
import { TextAnimate } from '@/ui/animations/text-animate';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import {
  MovieClipReveal,
  MovieHeroReveal,
  MovieSectionReveal,
  MovieSidebarReveal,
  getSurfaceItemMotion,
  getSurfacePanelMotion,
  useInitialItemRevealEnabled,
} from '@/features/movie/movie-motion';
import { getFilmographyCredits } from '@/features/person/utils';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PersonSectionSkeleton, PersonTimelineSkeleton } from '@/ui/skeletons/views/person';
import Registry from './registry';

const HERO_REVEAL_TIMING = Object.freeze({
  containerDelay: 0.1,
  titleDelay: 0.18,
  titleClipDelay: 0.16,
  titleDuration: 0.82,
  overviewDelay: 0.4,
});

const SECTION_REVEAL_TIMING = Object.freeze({
  gallery: 0.18,
  filmography: 0.26,
  timeline: 0.2,
  awards: 0.2,
});

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

function PersonMainContent({ person, animateItemReveal = true }) {
  const reduceMotion = useReducedMotion();
  const movieCredits = getFilmographyCredits(person, 'movie');

  return (
    <>
      {person?.images?.profiles?.length > 0 ? (
        <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.gallery} animateOnView={false}>
          <PersonGallery images={person.images} animateItemReveal={animateItemReveal} />
        </MovieSectionReveal>
      ) : null}

      {movieCredits.length > 0 ? (
        <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.filmography} animateOnView={false}>
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Filmography</h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {movieCredits.map((credit, index) => {
                const cardMotion = getSurfaceItemMotion({
                  enabled: animateItemReveal,
                  reduceMotion,
                  index,
                  distance: 18,
                  scale: 0.982,
                });

                return (
                  <motion.div
                    key={`${credit.media_type}-${credit.id}-${credit.credit_id}`}
                    initial={cardMotion.initial}
                    animate={cardMotion.animate}
                    transition={cardMotion.transition}
                  >
                    <FilmographyCard
                      credit={credit}
                      imagePriority={index < 8}
                      imageFetchPriority={index < 8 ? 'high' : undefined}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>
        </MovieSectionReveal>
      ) : null}
    </>
  );
}

function PersonDeferredContent({ person, secondaryDataPromise, activeView, animateItemReveal = true }) {
  const secondaryPerson = use(secondaryDataPromise);
  const mergedPerson = {
    ...person,
    ...secondaryPerson,
  };

  if (activeView === 'timeline') {
    return (
      <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.timeline} animateOnView={false}>
        <PersonTimeline person={mergedPerson} />
      </MovieSectionReveal>
    );
  }

  return <PersonMainContent person={mergedPerson} animateItemReveal={animateItemReveal} />;
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
  const reduceMotion = useReducedMotion();
  const shouldAnimateItemReveal = useInitialItemRevealEnabled();
  if (!person) return null;

  const biographyExcerpt = getBiographyExcerpt(person.biography);
  const viewMotion = getSurfacePanelMotion({ reduceMotion });
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

      <PageGradientShell>
        <div
          className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-3 pb-12 [overflow-anchor:none] sm:gap-8 sm:px-4 md:px-6`}
        >
          <div className="mt-6 flex w-full flex-col items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-20 lg:flex-row lg:gap-12">
            <div className="w-full shrink-0 self-start lg:sticky lg:top-6 lg:w-[400px]">
              <MovieSidebarReveal>
                <PersonSidebar person={person} age={age} />
              </MovieSidebarReveal>
            </div>

            <div className="flex w-full min-w-0 flex-col">
              <div className="flex w-full flex-col">
                <MovieHeroReveal delay={HERO_REVEAL_TIMING.containerDelay}>
                  <div className="flex min-w-0 items-end justify-between gap-3">
                    <MovieClipReveal animateOnView={false} delay={HERO_REVEAL_TIMING.titleClipDelay} className="min-w-0">
                      <TextAnimate
                        animation="cinematicUp"
                        by="word"
                        delay={HERO_REVEAL_TIMING.titleDelay}
                        duration={HERO_REVEAL_TIMING.titleDuration}
                        startOnView={false}
                        className="max-w-full [overflow-wrap:anywhere] font-zuume text-5xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl"
                      >
                        {person.name}
                      </TextAnimate>
                    </MovieClipReveal>
                  </div>
                </MovieHeroReveal>

                {biographyExcerpt ? (
                  <MovieHeroReveal delay={HERO_REVEAL_TIMING.overviewDelay} className="mt-4">
                    <MovieClipReveal animateOnView={false} delay={0.06}>
                      <p className="max-w-[72ch] text-left text-[15px] leading-6 text-black/70 sm:text-justify sm:text-base sm:leading-7">
                        {biographyExcerpt}
                      </p>
                    </MovieClipReveal>
                  </MovieHeroReveal>
                ) : null}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`person-view-${activeView}`}
                    initial={viewMotion.initial}
                    animate={viewMotion.animate}
                    exit={viewMotion.exit}
                    transition={viewMotion.transition}
                  >
                    {activeView === 'awards' ? (
                      <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.awards} animateOnView={false}>
                        <PersonAwards personId={person.id} />
                      </MovieSectionReveal>
                    ) : (
                      <Suspense fallback={deferredFallback}>
                        <PersonDeferredContent
                          person={person}
                          secondaryDataPromise={secondaryDataPromise}
                          activeView={activeView}
                          animateItemReveal={shouldAnimateItemReveal}
                        />
                      </Suspense>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </>
  );
}
