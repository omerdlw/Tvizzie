'use client'

import { useEffect, useMemo, useState } from 'react'

import { getPreferredMovieBackground } from '@/features/movie/utils'
import {
  calculateAge,
  getBackgroundMovieCandidates,
} from '@/features/person/utils'
import { TMDB_IMG } from '@/core/constants'
import { TmdbService } from '@/core/services/tmdb/tmdb.service'
import PersonView from './view'

function getMovieBackdropSrc(credit) {
  return credit?.backdrop_path ? `${TMDB_IMG}/w1280${credit.backdrop_path}` : null
}

function getFallbackBackgroundImage(person) {
  const candidates = getBackgroundMovieCandidates(person)

  return candidates.map(getMovieBackdropSrc).find(Boolean) || null
}

async function resolvePersonBackgroundImage(person) {
  const candidates = getBackgroundMovieCandidates(person)

  if (!candidates.length) {
    return null
  }

  const results = await Promise.all(
    candidates.map(async (credit) => {
      try {
        const response = await TmdbService.getMovieImages(credit.id)

        return getPreferredMovieBackground(response?.data) || getMovieBackdropSrc(credit)
      } catch {
        return getMovieBackdropSrc(credit)
      }
    })
  )

  return results.find(Boolean) || null
}

export default function Client({ person, secondaryDataPromise }) {
  const [activeView, setActiveView] = useState('main')
  const fallbackBackgroundImage = useMemo(
    () => getFallbackBackgroundImage(person),
    [person]
  )
  const [backgroundImage, setBackgroundImage] = useState(fallbackBackgroundImage)
  const age = useMemo(
    () => calculateAge(person?.birthday, person?.deathday),
    [person?.birthday, person?.deathday]
  )

  useEffect(() => {
    let isCurrent = true

    setBackgroundImage(fallbackBackgroundImage)

    void (async () => {
      try {
        const secondaryPerson = await Promise.resolve(secondaryDataPromise)
        const nextBackgroundImage = await resolvePersonBackgroundImage({
          ...person,
          ...secondaryPerson,
        })

        if (isCurrent) {
          setBackgroundImage(nextBackgroundImage || fallbackBackgroundImage)
        }
      } catch {
        if (isCurrent) {
          setBackgroundImage(fallbackBackgroundImage)
        }
      }
    })()

    return () => {
      isCurrent = false
    }
  }, [fallbackBackgroundImage, person, secondaryDataPromise])

  return (
    <PersonView
      person={person}
      secondaryDataPromise={secondaryDataPromise}
      activeView={activeView}
      setActiveView={setActiveView}
      age={age}
      backgroundImage={backgroundImage}
    />
  )
}
