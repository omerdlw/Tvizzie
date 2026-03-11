'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { AnimatePresence, motion } from 'framer-motion'

import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'
const HERO_COUNT = 5
const INTERVAL_MS = 8000

const SLIDE_VARIANTS = {
  enter: { opacity: 0, scale: 1.05 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
}

export default function HeroSpotlight({ items = [], onSlideChange }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const timerRef = useRef(null)
  const isPausedRef = useRef(false)

  const heroItems = items
    .filter((item) => item.backdrop_path)
    .slice(0, HERO_COUNT)

  useEffect(() => {
    if (heroItems.length > 0) {
      onSlideChange?.(heroItems[activeIndex]?.backdrop_path)
    }
  }, [activeIndex, heroItems, onSlideChange])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setActiveIndex((prev) => (prev + 1) % heroItems.length)
      }
    }, INTERVAL_MS)
  }, [heroItems.length])

  useEffect(() => {
    if (heroItems.length <= 1) return
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [heroItems.length, startTimer])

  const handleDotClick = useCallback(
    (index) => {
      setActiveIndex(index)
      startTimer()
    },
    [startTimer]
  )

  if (!heroItems.length) return null

  const current = heroItems[activeIndex]
  const isMovie = current.media_type === 'movie' || current.title
  const title = isMovie
    ? current.title || current.original_title
    : current.name || current.original_name
  const year = (isMovie ? current.release_date : current.first_air_date)?.slice(
    0,
    4
  )
  const rating =
    current.vote_average > 0 ? current.vote_average.toFixed(1) : null
  const href = isMovie ? `/movie/${current.id}` : `/tv/${current.id}`
  const overview =
    current.overview?.length > 200
      ? current.overview.slice(0, 200) + '...'
      : current.overview

  return (
    <div
      className="relative h-[50vh] max-h-[400px] min-h-[280px] w-full overflow-hidden rounded-[16px] ring-1 ring-white/10 sm:min-h-[360px] md:h-[60vh] md:max-h-[560px] md:min-h-[480px] md:rounded-[30px] lg:h-[70vh] lg:max-h-[720px]"
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
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={`${TMDB_IMG}/original${current.backdrop_path}`}
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-linear-to-t from-black via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-r from-black/60 via-transparent to-transparent" />

      <div className="absolute right-0 bottom-0 left-0 flex items-end justify-between gap-4 p-4 sm:gap-6 sm:p-6 md:gap-8 md:p-10">
        <div className="flex max-w-2xl flex-col gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white/70 uppercase ring-1 ring-white/10 backdrop-blur-sm">
                  {isMovie ? 'Movie' : 'TV'}
                </span>
                {rating && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-white/80">
                    <Icon
                      icon="solar:star-bold"
                      size={12}
                      className="text-yellow-500"
                    />
                    {rating}
                  </span>
                )}
                {year && <span className="text-sm text-white/50">{year}</span>}
              </div>

              <h2 className="font-zuume text-2xl leading-none font-bold tracking-tight uppercase sm:text-3xl md:text-5xl">
                {title}
              </h2>

              {overview && (
                <p className="hidden max-w-xl text-sm leading-relaxed text-white/50 sm:block">
                  {overview}
                </p>
              )}

              <Link
                href={href}
                className="mt-1 flex w-fit items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-xs font-semibold tracking-widest text-white uppercase ring-1 ring-white/15 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:ring-white/40"
              >
                <Icon icon="solar:play-bold" size={14} />
                Discover
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-2 pb-2">
          {heroItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`cursor-pointer rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'h-2 w-6 bg-white'
                  : 'h-2 w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
