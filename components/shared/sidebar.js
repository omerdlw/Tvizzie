'use client'

import { useMemo } from 'react'

import Link from 'next/link'

import { formatCurrency } from '@/lib/utils'
import Tooltip from '@/ui/elements/tooltip'
import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

const MAX_VISIBLE_PERSONS = 2

function SidebarRow({ icon, children }) {
  return (
    <div className="flex items-start gap-3 py-1.5 text-[13px] text-white/50">
      <Icon icon={icon} size={18} className="mt-0.4 shrink-0" />
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  )
}

function PersonsDisplay({ persons, label }) {
  if (!persons?.length) return null

  const visiblePersons = persons.slice(0, MAX_VISIBLE_PERSONS)
  const overflowPersons = persons.slice(MAX_VISIBLE_PERSONS)
  const hasOverflow = overflowPersons.length > 0

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0">{label}</span>
      <div className="flex flex-wrap items-center gap-1">
        {visiblePersons.map((person, index) => (
          <div key={person.id} className="flex items-center gap-1">
            <Link
              href={`/person/detail/${person.id}`}
              className="cursor-pointer text-white/70 transition-colors hover:text-white"
            >
              {person.name}
            </Link>
            {index === 0 && persons.length > 1 && (
              <span className="text-white/50">,</span>
            )}
          </div>
        ))}
        {hasOverflow && (
          <Tooltip
            className="rounded-[10px] bg-white p-1 text-xs text-black"
            text={overflowPersons.map((p) => p.name).join(', ')}
            position="top"
          >
            <span className="shrink-0 cursor-help text-xs font-bold text-white/50 transition-colors hover:text-white/70">
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
    item.spoken_languages?.find((l) => l.iso_639_1 === item.original_language)
      ?.english_name || item.original_language

  const rows = useMemo(() => {
    const items = []

    if (director) {
      const text = `Directed by ${director.name}`
      items.push({
        id: 'director',
        icon: 'solar:camera-minimalistic-bold',
        length: text.length,
        content: (
          <>
            <span className="mr-1">Directed by</span>
            <Link
              href={`/person/detail/${director.id}`}
              className="cursor-pointer text-white/70 transition-colors hover:text-white"
            >
              {director.name}
            </Link>
          </>
        ),
      })
    }

    if (writers?.length > 0) {
      const label = 'Written by'
      const names = writers
        .slice(0, MAX_VISIBLE_PERSONS)
        .map((p) => p.name)
        .join(', ')
      const overflow =
        writers.length > MAX_VISIBLE_PERSONS
          ? ` +${writers.length - MAX_VISIBLE_PERSONS}`
          : ''
      items.push({
        id: 'writers',
        icon: 'solar:pen-bold',
        length: `${label} ${names}${overflow}`.length,
        content: <PersonsDisplay persons={writers} label={label} />,
      })
    }

    if (creators?.length > 0) {
      const label = 'Created by'
      const names = creators
        .slice(0, MAX_VISIBLE_PERSONS)
        .map((p) => p.name)
        .join(', ')
      const overflow =
        creators.length > MAX_VISIBLE_PERSONS
          ? ` +${creators.length - MAX_VISIBLE_PERSONS}`
          : ''
      items.push({
        id: 'creators',
        icon: 'solar:pen-bold',
        length: `${label} ${names}${overflow}`.length,
        content: <PersonsDisplay persons={creators} label={label} />,
      })
    }

    if (certification) {
      const text = `Rated ${certification}`
      items.push({
        id: 'certification',
        icon: 'solar:shield-bold',
        length: text.length,
        content: (
          <>
            Rated <span className="text-white/80">{certification}</span>
          </>
        ),
      })
    }

    if (originalLanguageName) {
      const text = `Original Language: ${originalLanguageName}`
      items.push({
        id: 'language',
        icon: 'solar:globus-bold',
        length: text.length,
        content: (
          <>
            Original Language:{' '}
            <span className="text-white/80">{originalLanguageName}</span>
          </>
        ),
      })
    }

    if (item.status) {
      const text = `Status: ${item.status}`
      items.push({
        id: 'status',
        icon: 'solar:info-circle-bold',
        length: text.length,
        content: (
          <>
            Status: <span className="text-white/80">{item.status}</span>
          </>
        ),
      })
    }

    if (episodeRuntime) {
      const text = `~${episodeRuntime} min / episode`
      items.push({
        id: 'runtime',
        icon: 'solar:clock-circle-bold',
        length: text.length,
        content: (
          <>
            ~<span className="text-white/80">{episodeRuntime}</span> min /
            episode
          </>
        ),
      })
    }

    if (hasBudget) {
      const text = `Budget: ${formatCurrency(item.budget)}`
      items.push({
        id: 'budget',
        icon: 'solar:dollar-bold',
        length: text.length,
        content: (
          <>
            Budget:{' '}
            <span className="text-white/80">{formatCurrency(item.budget)}</span>
          </>
        ),
      })
    }

    if (hasRevenue) {
      const text = `Revenue: ${formatCurrency(item.revenue)}`
      items.push({
        id: 'revenue',
        icon: 'solar:graph-up-bold',
        length: text.length,
        content: (
          <>
            Revenue:{' '}
            <span className="text-white/80">
              {formatCurrency(item.revenue)}
            </span>
          </>
        ),
      })
    }

    return items.sort((a, b) => b.length - a.length)
  }, [
    director,
    writers,
    creators,
    certification,
    originalLanguageName,
    item.status,
    item.budget,
    item.revenue,
    episodeRuntime,
    hasBudget,
    hasRevenue,
  ])

  return (
    <div className="flex flex-col gap-5">
      <div
        className="relative aspect-2/3 w-full max-w-none shrink-0 overflow-hidden rounded-[30px] bg-cover bg-center bg-no-repeat ring-1 ring-white/10 lg:h-[600px] lg:w-[400px]"
        style={{
          backgroundImage: `url(${TMDB_IMG}/original${item.poster_path})`,
        }}
      />
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
