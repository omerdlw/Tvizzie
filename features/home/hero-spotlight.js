'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING, TMDB_IMG } from '@/lib/constants'
import { getImagePlaceholderDataUrl } from '@/lib/utils'
import Icon from '@/ui/icon'

const HERO_COUNT = 5
const INTERVAL_MS = DURATION.AMBIENT * 1000

const SLIDE_VARIANTS = {
  enter: { scale: 1.05 },
  center: { scale: 1 },
  exit: { scale: 0.98 },
}

export default function HeroSpotlight({ items = [], onSlideChange }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [rotationKey, setRotationKey] = useState(0)
  const isPausedRef = useRef(false)

  const heroItems = items
    .filter((item) => item.backdrop_path)
    .slice(0, HERO_COUNT)
  const safeActiveIndex = heroItems.length
    ? Math.min(activeIndex, heroItems.length - 1)
    : 0
  const current = heroItems[safeActiveIndex]

  useEffect(() => {
    setActiveIndex((previousIndex) =>
      heroItems.length
        ? Math.min(previousIndex, heroItems.length - 1)
        : 0
    )
  }, [heroItems.length])

  useEffect(() => {
    onSlideChange?.(current?.backdrop_path || null)
  }, [current?.backdrop_path, onSlideChange])

  useEffect(() => {
    if (heroItems.length <= 1) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      if (isPausedRef.current) {
        return
      }

      setActiveIndex((previousIndex) => (previousIndex + 1) % heroItems.length)
    }, INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [heroItems.length, rotationKey])

  const handleDotClick = useCallback((index) => {
    setActiveIndex(index)
    setRotationKey((value) => value + 1)
  }, [])

  if (!current) {
    return null
  }

  const title = current.title || current.original_title || 'Untitled'
  const year = current.release_date?.slice(0, 4)
  const rating =
    current.vote_average > 0 ? current.vote_average.toFixed(1) : null
  const href = `/movie/${current.id}`
  const overview =
    current.overview?.length > 200
      ? `${current.overview.slice(0, 200)}...`
      : current.overview

  return (
    <div
      className="relative h-[70vh] min-h-[400px] w-full overflow-hidden sm:min-h-[500px] md:h-[80vh] md:min-h-[600px] lg:h-[85vh]"
      onMouseEnter={() => {
        isPausedRef.current = true
      }}
      onMouseLeave={() => {
        isPausedRef.current = false
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          variants={SLIDE_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: DURATION.HERO, ease: EASING.STANDARD }}
          className="absolute inset-0"
        >
          <Image
            src={`${TMDB_IMG}/w1280${current.backdrop_path}`}
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1280px"
            quality={90}
            placeholder="blur"
            blurDataURL={getImagePlaceholderDataUrl(
              `${current.id}-${current.backdrop_path}`
            )}
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent md:from-black/40" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6 sm:p-8 md:gap-12 md:p-12 lg:p-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{
              duration: DURATION.MODERATE,
              ease: EASING.STANDARD,
            }}
            className="flex max-w-3xl flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold tracking-widest text-white uppercase backdrop-blur-sm">
                Featured Movie
              </span>

              {rating && (
                <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-sm font-semibold text-white backdrop-blur-sm">
                  <Icon
                    icon="solar:star-bold"
                    size={14}
                    className="text-yellow-400"
                  />
                  {rating}
                </span>
              )}

              {year && (
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-sm text-white backdrop-blur-sm">
                  {year}
                </span>
              )}
            </div>

            <h1 className="font-zuume text-3xl leading-none font-bold tracking-wide uppercase text-white sm:text-4xl md:text-6xl lg:text-7xl">
              {title}
            </h1>

            {overview && (
              <p className="max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:text-xl">
                {overview}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Link
                href={href}
                className="group flex items-center gap-2.5 rounded-full  px-6 py-3 text-sm font-semibold tracking-widest text-white uppercase transition-all duration-300 hover:/90 hover:scale-105"
              >
                <Icon icon="solar:play-bold" size={16} className="group-hover:scale-110 transition-transform" />
                Watch Now
              </Link>

              <button
                type="button"
                className="flex items-center gap-2.5 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold tracking-widest text-white uppercase backdrop-blur-sm transition-all duration-300 hover:bg-black/20 hover:border-white/40"
              >
                <Icon icon="solar:plus-bold" size={16} />
                Add to List
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex shrink-0 items-center gap-2 pb-4">
          {heroItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleDotClick(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={
                index === safeActiveIndex
                  ? 'h-2 w-8 cursor-pointer  transition-all duration-300'
                  : 'h-2 w-2 cursor-pointer bg-white/40 transition-all duration-300 hover:/60 hover:w-3'
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
