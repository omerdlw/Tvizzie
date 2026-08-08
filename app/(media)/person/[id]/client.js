'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPreferredMovieBackground } from '@/domains/media/services/media-data';
import {
  clearPersonPosterPreference,
  getPersonPosterPreferenceFilePath,
  setPersonPosterPreference,
} from '@/domains/media/utils/poster-preferences';
import { calculateAge, getBackgroundMovieCandidates } from '@/domains/media/utils/person-data';
import { TMDB_IMG } from '@/shared/constants';
import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';
// Person view is defined in this route client.
import { Suspense, use } from 'react';
import { motion } from 'framer-motion';
import PersonAwards from '@/domains/media/ui/components/person/awards';
import PersonBio from '@/domains/media/ui/components/person/bio';
import PersonFilmographySection from '@/domains/media/ui/sections/person/filmography-section';
import PersonGallery from '@/domains/media/ui/components/person/gallery';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import PersonTimeline from '@/domains/media/ui/components/person/timeline';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import { BlurryText } from '@/ui/motion/animations/blurry-text';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { Spinner } from '@/ui/feedback/spinner';
import Registry from '@/app/(media)/registry';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import {
  PERSON_TEXT,
  getDeferredChapterDelay,
  getMotionTimestamp,
  personBioVariants,
  personPortraitVariants,
  getSectionHeaderProps,
} from '@/app/(media)/motion';

function getMovieBackdropSrc(credit) {
  return credit?.backdrop_path ? `${TMDB_IMG}/original${credit.backdrop_path}` : null;
}

function getFallbackBackgroundImage(person) {
  const candidates = getBackgroundMovieCandidates(person);

  return candidates.map(getMovieBackdropSrc).find(Boolean) || null;
}

async function resolvePersonBackgroundImage(person) {
  const candidates = getBackgroundMovieCandidates(person);

  if (!candidates.length) {
    return null;
  }

  const results = await Promise.all(
    candidates.map(async (credit) => {
      try {
        const response = await TmdbService.getMovieImages(credit.id);

        return getPreferredMovieBackground(response?.data) || getMovieBackdropSrc(credit);
      } catch {
        return getMovieBackdropSrc(credit);
      }
    }),
  );

  return results.find(Boolean) || null;
}

export default function Client({ person, secondaryDataPromise }) {
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
        const nextBackgroundImage = await resolvePersonBackgroundImage({
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

function PersonMainContent({ person, choreographyStartedAt }) {
  return (
    <>
      {person?.images?.profiles?.length > 0 ? (
        <div className="mt-8 sm:mt-12">
          <PersonGallery
            images={person.images}
            baseDelay={getDeferredChapterDelay('gallery', choreographyStartedAt)}
          />
        </div>
      ) : null}

      <div className="mt-8 sm:mt-12">
        <PersonFilmographySection
          person={person}
          baseDelay={getDeferredChapterDelay('filmography', choreographyStartedAt)}
        />
      </div>
    </>
  );
}

function PersonDeferredContent({
  person,
  secondaryDataPromise,
  activeView,
  choreographyStartedAt,
}) {
  const secondaryPerson = use(secondaryDataPromise);
  const mergedPerson = {
    ...person,
    ...secondaryPerson,
  };
  if (activeView === 'timeline') {
    return (
      <motion.div
        className="mt-8 sm:mt-12"
        {...getSectionHeaderProps(
          getDeferredChapterDelay('generic', choreographyStartedAt),
          false,
          'generic',
        )}
      >
        <PersonTimeline person={mergedPerson} />
      </motion.div>
    );
  }
  return <PersonMainContent person={mergedPerson} choreographyStartedAt={choreographyStartedAt} />;
}

function PersonView({
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
  const choreographyStartedAtRef = useRef(getMotionTimestamp());
  if (!person) return null;
  const deferredFallback = (
    <div className="mt-8 flex justify-center py-12 sm:mt-12">
      <Spinner size={32} />
    </div>
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
              <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
                {person?.profile_path ? (
                  <motion.div
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-white/40 backdrop-blur-md sm:h-16 sm:w-16 lg:h-20 lg:w-20"
                    {...personPortraitVariants}
                  >
                    <AdaptiveImage
                      mode="img"
                      className="h-full w-full rounded-2xl object-cover"
                      src={`${TMDB_IMG}/w342${person.profile_path}`}
                      alt={person.name}
                      decoding="async"
                      wrapperClassName="h-full w-full rounded-2xl"
                    />
                  </motion.div>
                ) : null}

                <BlurryText
                  as="h1"
                  by="character"
                  {...PERSON_TEXT.TITLE}
                  className="font-zuume max-w-full text-left text-5xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl"
                >
                  {person.name}
                </BlurryText>
              </div>
            )}

            {activeView !== 'timeline' && activeView !== 'awards' && person?.biography ? (
              <motion.div {...personBioVariants} className="mx-auto w-full max-w-[72ch]">
                <PersonBio biography={person.biography} person={person} />
              </motion.div>
            ) : null}

            <div className="w-full text-left" key={`person-view-${activeView}`}>
              {activeView === 'awards' ? (
                <motion.div
                  className="mt-8 sm:mt-12"
                  {...getSectionHeaderProps(
                    getDeferredChapterDelay('generic', choreographyStartedAtRef.current),
                    false,
                    'generic',
                  )}
                >
                  <PersonAwards personId={person.id} />
                </motion.div>
              ) : (
                <Suspense fallback={deferredFallback}>
                  <PersonDeferredContent
                    person={person}
                    secondaryDataPromise={secondaryDataPromise}
                    activeView={activeView}
                    choreographyStartedAt={choreographyStartedAtRef.current}
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
