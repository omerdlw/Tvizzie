import { Suspense, use } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import PersonAwards from '@/features/person/awards';
import FilmographyCard from '@/features/person/filmography-card';
import PersonGallery from '@/features/person/gallery';
import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import PersonSidebar from '@/features/person/sidebar';
import PersonTimeline from '@/features/person/timeline';
import { TextAnimate } from '@/ui/animations/text-animate';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import {
  PersonClipReveal,
  PersonHeroReveal,
  PERSON_ROUTE_TIMING,
  PersonSectionReveal,
  PersonSidebarReveal,
  PersonSurfaceReveal,
  getPersonSurfaceItemMotion,
  getPersonSurfacePanelMotion,
  useInitialPersonItemRevealEnabled,
} from './motion';
import { getFilmographyCredits } from '@/features/person/utils';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PersonSectionSkeleton, PersonTimelineSkeleton } from '@/ui/skeletons/views/person';
import Registry from './registry';

function PersonGridDivider() {
  return (
    <div className="movie-detail-grid-divider" aria-hidden="true">
      <span className="movie-detail-grid-divider-startcap">
        <span className="movie-detail-grid-divider-diamond movie-detail-grid-divider-diamond-start" />
      </span>
      <span className="movie-detail-grid-divider-endcap">
        <span className="movie-detail-grid-divider-diamond movie-detail-grid-divider-diamond-end" />
      </span>
    </div>
  );
}

function PersonGridSection({ children, className = '' }) {
  return (
    <div className={`movie-detail-grid-subsection ${className}`}>
      <PersonGridDivider />
      <div className="movie-detail-grid-subsection-content movie-detail-shell-inset">{children}</div>
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

function PersonMainContent({ person, animateItemReveal = true }) {
  const movieCredits = getFilmographyCredits(person, 'movie');

  return (
    <>
      {person?.images?.profiles?.length > 0 ? (
        <PersonSectionReveal delay={PERSON_ROUTE_TIMING.sections.gallery} animateOnView={false}>
          <PersonGridSection>
            <PersonGallery images={person.images} animateItemReveal={animateItemReveal} />
          </PersonGridSection>
        </PersonSectionReveal>
      ) : null}

      {movieCredits.length > 0 ? (
        <PersonSectionReveal delay={PERSON_ROUTE_TIMING.sections.filmography} animateOnView={false}>
          <PersonGridSection>
            <PersonSurfaceReveal>
              <section className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold tracking-widest text-black/70 uppercase">Filmography</h2>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {movieCredits.map((credit, index) => {
                    const cardMotion = getPersonSurfaceItemMotion({
                      enabled: animateItemReveal,
                      index,
                      distance: 18,
                      scale: 0.976,
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
            </PersonSurfaceReveal>
          </PersonGridSection>
        </PersonSectionReveal>
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
      <PersonSectionReveal delay={PERSON_ROUTE_TIMING.sections.timeline} animateOnView={false}>
        <PersonGridSection>
          <PersonTimeline person={mergedPerson} />
        </PersonGridSection>
      </PersonSectionReveal>
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
  const shouldAnimateItemReveal = useInitialPersonItemRevealEnabled();
  if (!person) return null;

  const biographyExcerpt = getBiographyExcerpt(person.biography);
  const viewMotion = getPersonSurfacePanelMotion();
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
        <div
          className={`movie-detail-grid-frame relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`}
        >
          <div className="person-detail-grid-primary">
            <div className="movie-detail-grid-sidebar w-full shrink-0">
              <div className="lg:sticky lg:top-0">
                <PersonSidebarReveal delay={PERSON_ROUTE_TIMING.sidebar.containerDelay}>
                  <PersonSidebar person={person} age={age} />
                </PersonSidebarReveal>
              </div>
            </div>

            <div className="movie-detail-grid-main flex w-full min-w-0 flex-col">
              <div className="flex w-full flex-col">
                <div className="movie-detail-section-band movie-detail-shell-inset">
                  <PersonHeroReveal delay={PERSON_ROUTE_TIMING.hero.containerDelay}>
                    <div className="flex min-w-0 items-end justify-between gap-3">
                      <PersonClipReveal
                        animateOnView={false}
                        delay={PERSON_ROUTE_TIMING.hero.titleClipDelay}
                        className="min-w-0"
                      >
                        <TextAnimate
                          animation="cinematicUp"
                          by="word"
                          delay={PERSON_ROUTE_TIMING.hero.titleDelay}
                          duration={PERSON_ROUTE_TIMING.hero.titleDuration}
                          startOnView={false}
                          className="font-zuume max-w-full text-5xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl"
                        >
                          {person.name}
                        </TextAnimate>
                      </PersonClipReveal>
                    </div>
                  </PersonHeroReveal>

                  {biographyExcerpt ? (
                    <PersonHeroReveal delay={PERSON_ROUTE_TIMING.hero.overviewDelay} className="mt-4">
                      <PersonClipReveal animateOnView={false} delay={0.06}>
                        <p className="movie-detail-reading-measure text-left text-base leading-7 text-black/70 sm:text-justify">
                          {biographyExcerpt}
                        </p>
                      </PersonClipReveal>
                    </PersonHeroReveal>
                  ) : null}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`person-view-${activeView}`}
                    initial={viewMotion.initial}
                    animate={viewMotion.animate}
                    exit={viewMotion.exit}
                    transition={viewMotion.transition}
                  >
                    {activeView === 'awards' ? (
                      <PersonSectionReveal
                        delay={PERSON_ROUTE_TIMING.sections.awards}
                        animateOnView={false}
                      >
                        <PersonGridSection>
                          <PersonAwards personId={person.id} />
                        </PersonGridSection>
                      </PersonSectionReveal>
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
              <NavHeightSpacer className="w-full" />
            </div>
          </div>
        </div>
      </PageGradientShell>
    </>
  );
}
