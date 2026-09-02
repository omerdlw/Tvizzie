'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearPersonPosterPreference,
  getPersonPosterPreferenceFilePath,
  setPersonPosterPreference,
} from '@/domains/media/utils/poster-preferences';
import { calculateAge } from '@/domains/media/utils/person-data';
import { PAGE_SHELL_MAX_WIDTH_CLASS, TMDB_IMG } from '@/shared';
import { Suspense, use } from 'react';
import PersonAwards from '@/domains/media/ui/sections/awards-section';
import PersonBio from '@/domains/media/ui/components/person-bio';
import PersonFilmographySection from '@/domains/media/ui/sections/filmography-section';
import PersonGallery from '@/domains/media/ui/sections/gallery-section';
import { NavHeightSpacer, useRegisterBreadcrumbOverride } from '@/modules/nav';
import PersonTimeline from '@/domains/media/ui/sections/timeline-section';
import {
  PersonAwardsSkeleton,
  PersonDeferredContentSkeleton,
  PersonTimelineSkeleton,
} from '@/domains/media/ui/skeletons';
import MediaRegistry from '@/domains/media/ui/registry';
import { resolveImageQuality } from '@/shared';
import AdaptiveImage from '@/ui/components/adaptive-image';
import SocialLinks from '@/domains/media/ui/components/social-links';
import Icon from '@/ui/primitives/icon';

export default function PersonDetailView({ person, secondaryDataPromise, awardsPromise }) {
  const personId = person?.id;
  const fallbackPosterFilePath = person?.profile_path || null;
  const [activeView, setActiveView] = useState('main');
  const [awardsViewMode, setAwardsViewMode] = useState('projects');
  const [posterFilePath, setPosterFilePath] = useState(fallbackPosterFilePath);
  const [canResetPersonPoster, setCanResetPersonPoster] = useState(false);

  const personPath = personId ? `/person/${personId}` : null;
  useRegisterBreadcrumbOverride({
    path: personPath,
    title: person?.name || null,
  });
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

  return (
    <PersonView
      person={resolvedPerson}
      secondaryDataPromise={secondaryDataPromise}
      awardsPromise={awardsPromise}
      activeView={activeView}
      setActiveView={setActiveView}
      awardsViewMode={awardsViewMode}
      setAwardsViewMode={setAwardsViewMode}
      age={age}
      onSetPersonPoster={handleSetPersonPoster}
      onResetPersonPoster={handleResetPersonPoster}
      canResetPersonPoster={canResetPersonPoster}
    />
  );
}

function PersonMainContent({ person }) {
  const hasGallery = person?.images?.profiles?.length > 0;
  return (
    <div className="flex w-full flex-col gap-8 sm:gap-10 md:gap-12">
      {hasGallery ? <PersonGallery images={person.images} type="person" fullBleed={false} /> : null}
      <PersonFilmographySection person={person} />
    </div>
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
  awardsViewMode,
  setAwardsViewMode,
  age,
  onSetPersonPoster,
  onResetPersonPoster,
  canResetPersonPoster,
}) {
  if (!person) return null;
  const deferredFallback = <PersonDeferredContentSkeleton />;

  return (
    <>
      <MediaRegistry
        person={person}
        activeView={activeView}
        setActiveView={setActiveView}
        awardsViewMode={awardsViewMode}
        setAwardsViewMode={setAwardsViewMode}
        age={age}
        onSetPersonPoster={onSetPersonPoster}
        onResetPersonPoster={onResetPersonPoster}
        canResetPersonPoster={canResetPersonPoster}
      />
        <div
          className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col px-4 pb-16 [overflow-anchor:none] sm:px-6 lg:px-8`}
        >
          <div
            key={`person-scene-${activeView}`}
            className="relative flex w-full flex-col items-center pt-8 sm:pt-12 lg:pt-16"
          >
            {activeView !== 'timeline' && activeView !== 'awards' && (
              <div className="relative flex w-full flex-col items-center gap-6 pb-8 text-center sm:gap-7 sm:pb-10 lg:pb-12">
                {person?.profile_path ? (
                  <div
                    data-context-menu-target="person-poster-card"
                    data-poster-file-path={person.profile_path}
                    className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden rounded-[20px] lg:w-[20rem] xl:w-[24rem]"
                  >
                    <AdaptiveImage
                      fill
                      priority
                      src={`${TMDB_IMG}/original${person.profile_path}`}
                      alt={person.name}
                      fetchPriority="high"
                      sizes="(max-width: 1024px) 100vw, 400px"
                      quality={resolveImageQuality('hero')}
                      decoding="async"
                      className="rounded-[20px] object-cover"
                      wrapperClassName="h-full w-full rounded-[20px]"
                    />
                  </div>
                ) : (
                  <div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden rounded-[20px] lg:w-[20rem] xl:w-[24rem]">
                    <div className="center h-full w-full rounded-[20px] ring-1 ring-inset ring-white/5 text-white/50">
                      <Icon icon="solar:user-bold" size={40} />
                    </div>
                  </div>
                )}

                <h1 className="font-zuume max-w-full text-center text-7xl leading-[0.95] font-bold [overflow-wrap:anywhere] uppercase sm:text-8xl lg:text-9xl">
                  {person.name}
                </h1>

                {person?.biography ? (
                  <div className="mx-auto w-full max-w-[72ch]">
                    <PersonBio biography={person.biography} person={person} />
                  </div>
                ) : null}

                {person?.external_ids ? <SocialLinks externalIds={person.external_ids} /> : null}
              </div>
            )}

            <div
              className={`relative w-full text-left ${
                activeView === 'main' ? '' : 'pt-4 sm:pt-6 lg:pt-8'
              }`}
              key={`person-view-${activeView}`}
            >
              {activeView === 'awards' ? (
                <Suspense fallback={<PersonAwardsSkeleton />}>
                  <PersonAwards
                    personId={person.id}
                    awardsPromise={awardsPromise}
                    viewMode={awardsViewMode}
                    onViewModeChange={setAwardsViewMode}
                  />
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
    </>
  );
}
