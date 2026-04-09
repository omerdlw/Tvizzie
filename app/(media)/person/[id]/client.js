'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { getPreferredMovieBackground } from '@/features/movie/utils';
import {
  clearPersonPosterPreference,
  getPersonPosterPreferenceFilePath,
  setPersonPosterPreference,
} from '@/features/person/poster-preferences';
import { calculateAge, getBackgroundMovieCandidates } from '@/features/person/utils';
import { TMDB_IMG } from '@/core/constants';
import { TmdbService } from '@/core/services/tmdb/tmdb.service';
import PersonView from './view';

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
    })
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
  const age = useMemo(() => calculateAge(person?.birthday, person?.deathday), [person?.birthday, person?.deathday]);
  const resolvedPerson = useMemo(
    () => ({
      ...person,
      profile_path: posterFilePath || person?.profile_path || null,
    }),
    [person, posterFilePath]
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
    [personId]
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
