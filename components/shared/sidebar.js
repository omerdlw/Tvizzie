'use client'

import { useMemo } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { formatCurrency } from '@/lib/utils'
import Tooltip from '@/ui/elements/tooltip'
import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

const MAX_VISIBLE_PERSONS = 2

const LOCAL_PROVIDERS = {
  Netflix: '/images/providers/netflix.jpg',
  'Apple TV': '/images/providers/apple-tv.jpg',
  'Apple TV Plus': '/images/providers/apple-tv.jpg',
  'Apple TV Store': '/images/providers/apple-tv.jpg',
  'Disney Plus': '/images/providers/disney-plus.webp',
  'Amazon Prime Video': '/images/providers/amazon-prime.webp',
  'Google Play Movies': '/images/providers/play-store.png',
  'HBO Max': '/images/providers/hbo-max.webp',
  YouTube: '/images/providers/youtube.png',
  'TV+': '/images/providers/apple-tv.jpg',
  BluTV: '/images/providers/blu-tv.png',
  MUBI: '/images/providers/mubi.png',
}

function WatchProviders({ providers, videos }) {
  const trProviders = providers?.results?.TR
  if (!trProviders) return null

  const trailer = videos?.results?.find(
    (v) =>
      v.site === 'YouTube' &&
      (v.type === 'Trailer' || v.type === 'Teaser') &&
      v.official
  )

  const allProviders = [
    ...(trProviders.flatrate || []).map((p) => ({ ...p, type: 'PLAY' })),
    ...(trProviders.rent || []).map((p) => ({ ...p, type: 'RENT' })),
    ...(trProviders.buy || []).map((p) => ({ ...p, type: 'BUY' })),
  ]

  const uniqueProviders = []
  const seen = new Set()

  allProviders.forEach((p) => {
    const key = `${p.provider_name}-${p.type}`
    if (!seen.has(key)) {
      uniqueProviders.push(p)
      seen.add(key)
    }
  })

  if (uniqueProviders.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
          Where to Watch
        </span>
        {trailer && (
          <button
            onClick={() => {
              window.open(
                `https://www.youtube.com/watch?v=${trailer.key}`,
                '_blank'
              )
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 transition-colors hover:text-white"
          >
            <Icon icon="solar:play-circle-bold" size={16} />
            Trailer
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {uniqueProviders.slice(0, 5).map((provider) => {
          const localIcon = LOCAL_PROVIDERS[provider.provider_name]
          const iconUrl = localIcon || `${TMDB_IMG}/w154${provider.logo_path}`

          return (
            <div
              key={`${provider.provider_id}-${provider.type}`}
              className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <img
                  src={iconUrl}
                  alt={provider.provider_name}
                  className="h-8 w-8 object-cover"
                />
                <span className="text-[13px] font-medium text-white/80">
                  {provider.provider_name}
                </span>
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-[4px] bg-white/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white/60">
                  {provider.type}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
              href={`/person/${person.id}`}
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
              href={`/person/${director.id}`}
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
      <div className="relative aspect-2/3 w-full max-w-none shrink-0 overflow-hidden rounded-[30px] ring-1 ring-white/10 lg:h-[600px] lg:w-[400px]">
        <Image
          src={`${TMDB_IMG}/original${item.poster_path}`}
          alt={item.title || item.name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 400px"
        />
      </div>
      {topContent}
      <div className="flex flex-col gap-1 px-2">
        {rows.map((row) => (
          <SidebarRow key={row.id} icon={row.icon}>
            {row.content}
          </SidebarRow>
        ))}
      </div>
      <WatchProviders
        providers={item['watch/providers']}
        videos={item.videos}
        logoSize="w-10 h-10" // Added prop to control logo size
      />
    </div>
  )
}
