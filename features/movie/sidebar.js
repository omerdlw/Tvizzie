'use client'

import { useMemo } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { TMDB_IMG } from '@/core/constants'
import { formatCurrency, getImagePlaceholderDataUrl } from '@/core/utils'
import Tooltip from '@/ui/elements/tooltip'
import Icon from '@/ui/icon'

const MAX_VISIBLE_PERSONS = 2

function createSidebarRow(id, icon, content, length) {
  return { id, icon, content, length }
}

function SidebarRow({ icon, children }) {
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      <Icon
        className="mt-0.5 shrink-0 text-white/70"
        icon={icon}
        size={18}
      />
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  )
}

function PersonsDisplay({ persons, label }) {
  if (!persons?.length) {
    return null
  }

  const visiblePersons = persons.slice(0, MAX_VISIBLE_PERSONS)
  const overflowPersons = persons.slice(MAX_VISIBLE_PERSONS)

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0">{label}</span>
      <div className="flex flex-wrap items-center gap-1">
        {visiblePersons.map((person, index) => (
          <div key={person.id} className="flex items-center gap-1">
            <Link
              href={`/person/${person.id}`}
              className="cursor-pointer text-white/70 transition-colors hover:text-white"
            >
              {person.name}
            </Link>
            {index === 0 && persons.length > 1 && (
              <span className="text-white">,</span>
            )}
          </div>
        ))}

        {overflowPersons.length > 0 && (
          <Tooltip
            text={overflowPersons.map((person) => person.name).join(', ')}
            position="top"
          >
            <span className="shrink-0 cursor-help text-xs font-bold text-white transition-colors hover:text-white">
              +{overflowPersons.length}
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({
  item,
  director,
  writers,
  creators,
  certification,
  topContent,
}) {
  const hasBudget = item.budget > 0
  const hasRevenue = item.revenue > 0
  const episodeRuntime =
    item.episode_run_time?.[0] || item.last_episode_to_air?.runtime || null
  const originalLanguageName =
    item.spoken_languages?.find(
      (language) => language.iso_639_1 === item.original_language
    )?.english_name || item.original_language
  const posterSrc = item.poster_path ? `${TMDB_IMG}/w780${item.poster_path}` : null

  const rows = useMemo(() => {
    const nextRows = []

    if (director) {
      const text = `Directed by ${director.name}`

      nextRows.push(
        createSidebarRow(
          'director',
          'solar:camera-minimalistic-bold',
          <>
            <span className="mr-1">Directed by</span>
            <Link
              href={`/person/${director.id}`}
              className="cursor-pointer text-white/70 transition-colors hover:text-white"
            >
              {director.name}
            </Link>
          </>,
          text.length
        )
      )
    }

    if (writers?.length) {
      const label = 'Written by'
      const names = writers
        .slice(0, MAX_VISIBLE_PERSONS)
        .map((person) => person.name)
        .join(', ')
      const overflow =
        writers.length > MAX_VISIBLE_PERSONS
          ? ` +${writers.length - MAX_VISIBLE_PERSONS}`
          : ''

      nextRows.push(
        createSidebarRow(
          'writers',
          'solar:pen-bold',
          <PersonsDisplay persons={writers} label={label} />,
          `${label} ${names}${overflow}`.length
        )
      )
    }

    if (creators?.length) {
      const label = 'Created by'
      const names = creators
        .slice(0, MAX_VISIBLE_PERSONS)
        .map((person) => person.name)
        .join(', ')
      const overflow =
        creators.length > MAX_VISIBLE_PERSONS
          ? ` +${creators.length - MAX_VISIBLE_PERSONS}`
          : ''

      nextRows.push(
        createSidebarRow(
          'creators',
          'solar:pen-bold',
          <PersonsDisplay persons={creators} label={label} />,
          `${label} ${names}${overflow}`.length
        )
      )
    }

    if (certification) {
      nextRows.push(
        createSidebarRow(
          'certification',
          'solar:shield-bold',
          <>
            Rated <span className="text-white/70">{certification}</span>
          </>,
          `Rated ${certification}`.length
        )
      )
    }

    if (originalLanguageName) {
      nextRows.push(
        createSidebarRow(
          'language',
          'solar:globus-bold',
          <>
            Original Language:{' '}
            <span className="text-white/70">{originalLanguageName}</span>
          </>,
          `Original Language: ${originalLanguageName}`.length
        )
      )
    }

    if (item.status) {
      nextRows.push(
        createSidebarRow(
          'status',
          'solar:info-circle-bold',
          <>
            Status: <span className="text-white/70">{item.status}</span>
          </>,
          `Status: ${item.status}`.length
        )
      )
    }

    if (episodeRuntime) {
      nextRows.push(
        createSidebarRow(
          'runtime',
          'solar:clock-circle-bold',
          <>
            ~<span className="text-white/70">{episodeRuntime}</span> min /
            episode
          </>,
          `~${episodeRuntime} min / episode`.length
        )
      )
    }

    if (hasBudget) {
      const budget = formatCurrency(item.budget)

      nextRows.push(
        createSidebarRow(
          'budget',
          'solar:dollar-bold',
          <>
            Budget: <span className="text-white/70">{budget}</span>
          </>,
          `Budget: ${budget}`.length
        )
      )
    }

    if (hasRevenue) {
      const revenue = formatCurrency(item.revenue)

      nextRows.push(
        createSidebarRow(
          'revenue',
          'solar:graph-up-bold',
          <>
            Revenue: <span className="text-white/70">{revenue}</span>
          </>,
          `Revenue: ${revenue}`.length
        )
      )
    }

    return nextRows.sort((a, b) => b.length - a.length)
  }, [
    creators,
    director,
    certification,
    writers,
    originalLanguageName,
    item.status,
    item.budget,
    item.revenue,
    episodeRuntime,
    hasBudget,
    hasRevenue,
  ])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-2/3 w-full max-w-none shrink-0 overflow-hidden rounded-[16px] lg:h-[600px] lg:w-[400px]">
        {posterSrc ? (
          <Image
            fill
            priority
            src={posterSrc}
            alt={item.title || item.name}
            sizes="(max-width: 1024px) 100vw, 400px"
            quality={88}
            placeholder="blur"
            blurDataURL={getImagePlaceholderDataUrl(
              `${item?.id || item?.title || item?.name}-${item?.poster_path}`
            )}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/55">
            <Icon icon="solar:clapperboard-play-bold" size={40} />
          </div>
        )}
      </div>

      {topContent}

      <div className="flex flex-col gap-1 px-2">
        {rows.map((row) => (
          <SidebarRow key={row.id} icon={row.icon}>
            {row.content}
          </SidebarRow>
        ))}
      </div>
    </div>
  )
}
