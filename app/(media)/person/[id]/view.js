import { Suspense, use } from 'react';
import PersonAwards from '@/features/person/awards';
import PersonBio from '@/features/person/bio';
import PersonFilmographySection from '@/features/person/filmography-section';
import PersonGallery from '@/features/person/gallery';
import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import PersonTimeline from '@/features/person/timeline';
import { TextAnimate } from '@/ui/animations/text-animate';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import {
  PersonClipReveal,
  PersonHeroReveal,
  PERSON_ROUTE_TIMING,
  PersonSectionReveal,
  PersonSurfaceReveal,
} from '@/features/media/static-route-elements';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PersonSectionSkeleton, PersonTimelineSkeleton } from '@/ui/skeletons/views/person';
import Registry from './registry';

function PersonMainContent({ person, animateItemReveal = true }) {
  return (
    <>
      {person?.images?.profiles?.length > 0 ? (
        <PersonSectionReveal
          className="mt-8 sm:mt-12"
          delay={PERSON_ROUTE_TIMING.sections.gallery}
          animateOnView={false}
        >
          <PersonGallery images={person.images} animateItemReveal={animateItemReveal} />
        </PersonSectionReveal>
      ) : null}

      <PersonSectionReveal
        className="mt-8 sm:mt-12"
        delay={PERSON_ROUTE_TIMING.sections.filmography}
        animateOnView={false}
      >
        <PersonSurfaceReveal>
          <PersonFilmographySection person={person} />
        </PersonSurfaceReveal>
      </PersonSectionReveal>
    </>
  );
}

function PersonDeferredContent({
  person,
  secondaryDataPromise,
  activeView,
  animateItemReveal = true,
}) {
  const secondaryPerson = use(secondaryDataPromise);
  const mergedPerson = {
    ...person,
    ...secondaryPerson,
  };
  if (activeView === 'timeline') {
    return (
      <PersonSectionReveal
        className="mt-8 sm:mt-12"
        delay={PERSON_ROUTE_TIMING.sections.timeline}
        animateOnView={false}
      >
        <PersonTimeline person={mergedPerson} />
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
  if (!person) return null;
  const deferredFallback =
    activeView === 'timeline' ? (
      <PersonTimelineSkeleton className="mt-8 sm:mt-12" />
    ) : (
      <PersonSectionSkeleton className="mt-8 sm:mt-12" />
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
          <div className="mt-16 flex w-full flex-col items-center gap-6 sm:mt-24 sm:gap-8 lg:mt-36">
            
            {activeView !== 'timeline' && activeView !== 'awards' && (
              <PersonHeroReveal delay={PERSON_ROUTE_TIMING.hero.containerDelay}>
                <PersonClipReveal
                  animateOnView={false}
                  delay={PERSON_ROUTE_TIMING.hero.titleClipDelay}
                  className="w-full text-center"
                >
                  <TextAnimate
                    animation="cinematicUp"
                    by="word"
                    delay={PERSON_ROUTE_TIMING.hero.titleDelay}
                    duration={PERSON_ROUTE_TIMING.hero.titleDuration}
                    startOnView={false}
                    className="font-zuume mx-auto max-w-full text-5xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl"
                  >
                    {person.name}
                  </TextAnimate>
                </PersonClipReveal>
              </PersonHeroReveal>
            )}

            
            {activeView !== 'timeline' && activeView !== 'awards' && person?.biography ? (
              <PersonHeroReveal delay={PERSON_ROUTE_TIMING.hero.overviewDelay}>
                <PersonClipReveal animateOnView={false} delay={0.06} className="mx-auto max-w-[72ch]">
                  <PersonBio biography={person.biography} person={person} />
                </PersonClipReveal>
              </PersonHeroReveal>
            ) : null}

            
            <div className="w-full text-left" key={`person-view-${activeView}`}>
              {activeView === 'awards' ? (
                <PersonSectionReveal
                  className="mt-8 sm:mt-12"
                  delay={PERSON_ROUTE_TIMING.sections.awards}
                  animateOnView={false}
                >
                  <PersonAwards personId={person.id} />
                </PersonSectionReveal>
              ) : (
                <Suspense fallback={deferredFallback}>
                  <PersonDeferredContent
                    person={person}
                    secondaryDataPromise={secondaryDataPromise}
                    activeView={activeView}
                    animateItemReveal={false}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </>
  );
}
