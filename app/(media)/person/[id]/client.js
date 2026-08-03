'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPreferredMovieBackground } from '@/domains/media/ui/media-data';
import {
  clearPersonPosterPreference,
  getPersonPosterPreferenceFilePath,
  setPersonPosterPreference,
} from '@/domains/media/ui/person/awards';
import { calculateAge, getBackgroundMovieCandidates } from '@/domains/media/ui/person/awards';
import { TMDB_IMG } from '@/shared/constants';
import { TmdbService } from '@/infrastructure/tmdb/services/tmdb-service';
// Person view is defined in this route client.
import { Suspense, use } from 'react';
import { motion } from 'framer-motion';
import PersonAwards from '@/domains/media/ui/person/awards';
import PersonBio from '@/domains/media/ui/person/bio';
import PersonFilmographySection from '@/domains/media/ui/person/filmography-section';
import PersonGallery from '@/domains/media/ui/person/gallery';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import PersonTimeline from '@/domains/media/ui/person/timeline';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import { BlurryText } from '@/ui/motion/animations/blurry-text';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { Spinner } from '@/ui/feedback/spinner';
import Registry from '@/app/(media)/registry';
import {
  personTitleVariants,
  personBioVariants,
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

function PersonMainContent({ person }) {
  return (
    <>
      {person?.images?.profiles?.length > 0 ? (
        <div className="mt-8 sm:mt-12">
          <PersonGallery images={person.images} />
        </div>
      ) : null}

      <div className="mt-8 sm:mt-12">
        <PersonFilmographySection person={person} />
      </div>
    </>
  );
}

function PersonDeferredContent({
  person,
  secondaryDataPromise,
  activeView,
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
        {...getSectionHeaderProps(0.15)}
      >
        <PersonTimeline person={mergedPerson} />
      </motion.div>
    );
  }
  return <PersonMainContent person={mergedPerson} />;
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
  if (!person) return null;
  const deferredFallback = (
    <div className="flex justify-center py-12 mt-8 sm:mt-12">
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
              <BlurryText
                as="h1"
                by="character"
                delay={0.10}
                duration={0.75}
                stagger={0.038}
                className="font-zuume mx-auto max-w-full text-5xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl text-center"
              >
                {person.name}
              </BlurryText>
            )}

            {activeView !== 'timeline' && activeView !== 'awards' && person?.biography ? (
              <motion.div {...personBioVariants} className="mx-auto max-w-[72ch] w-full">
                <PersonBio biography={person.biography} person={person} />
              </motion.div>
            ) : null}

            <div className="w-full text-left" key={`person-view-${activeView}`}>
              {activeView === 'awards' ? (
                <motion.div
                  className="mt-8 sm:mt-12"
                  {...getSectionHeaderProps(0.15)}
                >
                  <PersonAwards personId={person.id} />
                </motion.div>
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
    </>
  );
}
