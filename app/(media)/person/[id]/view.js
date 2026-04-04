import { Suspense, use } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TextAnimate } from '@/components/ui/text-animate';
import PersonAwards from '@/features/person/awards';
import FilmographyCard from '@/features/person/filmography-card';
import PersonGallery from '@/features/person/gallery';
import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import PersonSidebar from '@/features/person/sidebar';
import PersonTimeline from '@/features/person/timeline';
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop';
import {
  MovieHeroReveal,
  MovieSectionReveal,
  MovieSectionSkeleton,
  MovieSidebarReveal,
} from '@/features/movie/movie-motion';
import { getFilmographyCredits, getPersonLifeRange } from '@/features/person/utils';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import Registry from './registry';

const HERO_REVEAL_TIMING = Object.freeze({
  containerDelay: 0.12,
  titleDelay: 0.18,
  titleDuration: 0.54,
  taglineDelay: 0.3,
  overviewDelay: 0.42,
});

const SECTION_REVEAL_TIMING = Object.freeze({
  gallery: 0.22,
  filmography: 0.34,
  timeline: 0.24,
  awards: 0.24,
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

function PersonMainContent({ person }) {
  const reduceMotion = useReducedMotion();
  const movieCredits = getFilmographyCredits(person, 'movie');

  return (
    <>
      {person?.images?.profiles?.length > 0 ? (
        <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.gallery}>
          <PersonGallery images={person.images} />
        </MovieSectionReveal>
      ) : null}

      {movieCredits.length > 0 ? (
        <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.filmography}>
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Filmography</h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {movieCredits.map((credit, index) => (
                <motion.div
                  key={`${credit.media_type}-${credit.id}-${credit.credit_id}`}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reduceMotion ? 0 : index * 0.015,
                    duration: reduceMotion ? 0.14 : 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <FilmographyCard
                    credit={credit}
                    imagePriority={index < 8}
                    imageFetchPriority={index < 8 ? 'high' : undefined}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        </MovieSectionReveal>
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
      <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.timeline}>
        <PersonTimeline person={mergedPerson} />
      </MovieSectionReveal>
    );
  }

  return <PersonMainContent person={mergedPerson} />;
}

export default function PersonView({ person, secondaryDataPromise, activeView, setActiveView, age, backgroundImage }) {
  const reduceMotion = useReducedMotion();
  if (!person) return null;

  const lifeRange = getPersonLifeRange(person);
  const biographyExcerpt = getBiographyExcerpt(person.biography);
  const heroMeta = [person?.known_for_department, lifeRange].filter(Boolean).join(' • ');
  const viewTransition = reduceMotion
    ? {
        duration: 0.12,
      }
    : {
        duration: 0.34,
        ease: [0.22, 1, 0.36, 1],
      };

  return (
    <>
      <Registry
        person={person}
        activeView={activeView}
        setActiveView={setActiveView}
        age={age}
        backgroundImage={backgroundImage}
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
                  <div className="flex items-end justify-between gap-3">
                    <TextAnimate
                      animation="slideUp"
                      by="word"
                      delay={HERO_REVEAL_TIMING.titleDelay}
                      duration={HERO_REVEAL_TIMING.titleDuration}
                      startOnView={false}
                      className="font-zuume text-6xl leading-none font-bold uppercase drop-shadow-sm drop-shadow-black/20 sm:text-7xl lg:text-8xl"
                    >
                      {person.name}
                    </TextAnimate>
                  </div>
                </MovieHeroReveal>

                {heroMeta ? (
                  <MovieHeroReveal delay={HERO_REVEAL_TIMING.taglineDelay} className="mt-4">
                    <p className="text-[11px] font-semibold tracking-widest text-black/80 uppercase drop-shadow-sm drop-shadow-black/20 sm:text-sm">
                      {heroMeta}
                    </p>
                  </MovieHeroReveal>
                ) : null}

                {biographyExcerpt ? (
                  <MovieHeroReveal delay={HERO_REVEAL_TIMING.overviewDelay} className="mt-4">
                    <p className="max-w-[72ch] text-[15px] leading-6 text-pretty drop-shadow-sm drop-shadow-black/20 sm:text-base sm:leading-7">
                      {biographyExcerpt}
                    </p>
                  </MovieHeroReveal>
                ) : null}

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`person-view-${activeView}`}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
                    transition={viewTransition}
                  >
                    {activeView === 'awards' ? (
                      <MovieSectionReveal className="mt-10" delay={SECTION_REVEAL_TIMING.awards}>
                        <PersonAwards personId={person.id} />
                      </MovieSectionReveal>
                    ) : (
                      <Suspense fallback={<MovieSectionSkeleton />}>
                        <PersonDeferredContent
                          person={person}
                          secondaryDataPromise={secondaryDataPromise}
                          activeView={activeView}
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
