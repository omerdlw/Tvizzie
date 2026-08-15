'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearPersonPosterPreference,
  getPersonPosterPreferenceFilePath,
  setPersonPosterPreference,
} from '@/domains/media/utils/poster-preferences';
import { calculateAge, getBackgroundMovieCandidates } from '@/domains/media/utils/person-data';
import { PAGE_SHELL_MAX_WIDTH_CLASS, TMDB_IMG } from '@/shared/constants';
import { Suspense, use } from 'react';
import PersonAwards from '@/domains/media/ui/components/person/awards';
import PersonAwardsSkeleton from '@/domains/media/ui/components/person/awards-skeleton';
import PersonBio from '@/domains/media/ui/components/person/bio';
import PersonFilmographySection from '@/domains/media/ui/sections/filmography-section';
import PersonGallery from '@/domains/media/ui/components/person/gallery';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import PersonTimeline from '@/domains/media/ui/components/person/timeline';
import PersonTimelineSkeleton from '@/domains/media/ui/components/person/timeline-skeleton';
import { PersonDeferredContentSkeleton } from './loading';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import Registry from '@/app/(media)/registry';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import PersonGridFrame from '@/domains/media/ui/layouts/person-grid-frame';
import { MediaRouteMotionProvider, MediaRouteReveal } from '@/app/(media)/motion';

function getMovieBackdropSrc(credit) {
  return credit?.backdrop_path ? `${TMDB_IMG}/original${credit.backdrop_path}` : null;
}

function getFallbackBackgroundImage(person) {
  const candidates = getBackgroundMovieCandidates(person);

  return candidates.map(getMovieBackdropSrc).find(Boolean) || null;
}

export default function Client({ person, secondaryDataPromise, awardsPromise }) {
  const personId = person?.id;
  const fallbackPosterFilePath = person?.profile_path || null;
  const [activeView, setActiveView] = useState('main');
  const fallbackBackgroundImage = useMemo(() => getFallbackBackgroundImage(person), [person]);
  const [backgroundImage, setBackgroundImage] = useState(fallbackBackgroundImage);
  const [posterFilePath, setPosterFilePath] = useState(fallbackPosterFilePath);
  const [canResetPersonPoster, setCanResetPersonPoster] = useState(false);
  const age = useMemo(
    () => calculateAge(person?.birthday, person?.deathday),
    [person?.birthday, person?.deathday],
  );
  const resolvedPerson = useMemo(
    () => ({
      ...person,
      profile_path: posterFilePath || person?.profile_path || null,
    }),
    [person, posterFilePath],
  );

  const handleSetPersonPoster = useCallback(
    ({ filePath }) => {
      if (!personId || typeof filePath !== 'string' || !filePath.trim()) {
        return;
      }

      setPersonPosterPreference(personId, filePath);
      setCanResetPersonPoster(true);
      setPosterFilePath(filePath);
    },
    [personId],
  );

  const handleResetPersonPoster = useCallback(() => {
    if (!personId) {
      return;
    }

    clearPersonPosterPreference(personId);
    setCanResetPersonPoster(false);
    setPosterFilePath(fallbackPosterFilePath || null);
  }, [fallbackPosterFilePath, personId]);

  useEffect(() => {
    const preferredPosterFilePath = getPersonPosterPreferenceFilePath(personId);
    setCanResetPersonPoster(Boolean(preferredPosterFilePath));
    setPosterFilePath(preferredPosterFilePath || fallbackPosterFilePath || null);
  }, [fallbackPosterFilePath, personId]);

  useEffect(() => {
    let isCurrent = true;

    setBackgroundImage(fallbackBackgroundImage);

    void (async () => {
      try {
        const secondaryPerson = await Promise.resolve(secondaryDataPromise);
        const nextBackgroundImage = getFallbackBackgroundImage({
          ...person,
          ...secondaryPerson,
        });

        if (isCurrent) {
          setBackgroundImage(nextBackgroundImage || fallbackBackgroundImage);
        }
      } catch {
        if (isCurrent) {
          setBackgroundImage(fallbackBackgroundImage);
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [fallbackBackgroundImage, person, secondaryDataPromise]);

  return (
    <PersonView
      person={resolvedPerson}
      secondaryDataPromise={secondaryDataPromise}
      awardsPromise={awardsPromise}
      activeView={activeView}
      setActiveView={setActiveView}
      age={age}
      backgroundImage={backgroundImage}
      onSetPersonPoster={handleSetPersonPoster}
      onResetPersonPoster={handleResetPersonPoster}
      canResetPersonPoster={canResetPersonPoster}
    />
  );
}

function PersonMainContent({ person }) {
  const hasGallery = person?.images?.profiles?.length > 0;
  return (
    <>
      {hasGallery ? <PersonGallery images={person.images} /> : null}
      <PersonFilmographySection person={person} />
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
    return <PersonTimeline person={mergedPerson} />;
  }
  return <PersonMainContent person={mergedPerson} />;
}

function PersonView({
  person,
  secondaryDataPromise,
  awardsPromise,
  activeView,
  setActiveView,
  age,
  backgroundImage,
  onSetPersonPoster,
  onResetPersonPoster,
  canResetPersonPoster,
}) {
  if (!person) return null;
  const deferredFallback = <PersonDeferredContentSkeleton />;

  return (
    <MediaRouteMotionProvider routeKey={`person-${person.id}-${activeView}`}>
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

      <PageGradientShell className="overflow-hidden">
        <PersonGridFrame />
        <div
          className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col pb-12 [overflow-anchor:none]`}
        >
          <div key={`person-scene-${activeView}`} className="flex w-full flex-col items-center">
            {activeView !== 'timeline' && activeView !== 'awards' && (
              <div className="relative flex w-full flex-col items-center gap-6 px-4 py-16 sm:gap-8 sm:py-24 lg:py-32">
                <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
                  {person?.profile_path ? (
                    <MediaRouteReveal stage="person.hero.portrait">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-black/40 backdrop-blur-md sm:h-16 sm:w-16 lg:h-20 lg:w-20">
                        <AdaptiveImage
                          mode="img"
                          className="h-full w-full object-cover"
                          src={`${TMDB_IMG}/original${person.profile_path}`}
                          alt={person.name}
                          decoding="async"
                          wrapperClassName="h-full w-full "
                        />
                      </div>
                    </MediaRouteReveal>
                  ) : null}

                  <MediaRouteReveal stage="person.hero.title">
                    <h1 className="font-zuume max-w-full text-left text-5xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl">
                      {person.name}
                    </h1>
                  </MediaRouteReveal>
                </div>

                {person?.biography ? (
                  <MediaRouteReveal className="mx-auto w-full max-w-[72ch]" stage="person.hero.bio">
                    <PersonBio biography={person.biography} person={person} />
                  </MediaRouteReveal>
                ) : null}

                <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
              </div>
            )}

            <div
              className={`relative w-full text-left ${
                activeView === 'main' || activeView === 'awards' ? '' : 'pt-6 sm:pt-8 lg:pt-12'
              }`}
              key={`person-view-${activeView}`}
            >
              {activeView !== 'main' ? (
                <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
              ) : null}
              {activeView === 'awards' ? (
                <Suspense fallback={<PersonAwardsSkeleton />}>
                  <PersonAwards personId={person.id} awardsPromise={awardsPromise} />
                </Suspense>
              ) : activeView === 'timeline' ? (
                <Suspense fallback={<PersonTimelineSkeleton />}>
                  <PersonDeferredContent
                    person={person}
                    secondaryDataPromise={secondaryDataPromise}
                    activeView={activeView}
                  />
                </Suspense>
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
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </MediaRouteMotionProvider>
  );
}
