'use client'

import { useMemo } from 'react'

import { TMDB_IMG } from '@/core/constants'

const MAX_WATCH_PROVIDERS = 6
const DEFAULT_REGION = 'TR'

function buildProviderList(watchProviders) {
  const providers = [
    ...(watchProviders?.flatrate || []).map((provider) => ({
      ...provider,
      type: 'PLAY',
    })),
    ...(watchProviders?.rent || []).map((provider) => ({
      ...provider,
      type: 'RENT',
    })),
    ...(watchProviders?.buy || []).map((provider) => ({
      ...provider,
      type: 'BUY',
    })),
  ]

  const uniqueProviders = []
  const seen = new Set()

  providers.forEach((provider) => {
    const key = `${provider.provider_id}-${provider.type}`

    if (seen.has(key)) {
      return
    }

    seen.add(key)
    uniqueProviders.push(provider)
  })

  return uniqueProviders.slice(0, MAX_WATCH_PROVIDERS)
}

export default function WatchProvidersSurface({
  providers,
  region = DEFAULT_REGION,
}) {
  const regionalProviders = providers?.results?.[region]

  const providerList = useMemo(
    () => buildProviderList(regionalProviders),
    [regionalProviders]
  )

  return (
    <div className="flex w-full flex-col border border-white/10 rounded-[12px]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 p-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-[11px] font-bold tracking-widest text-white uppercase">
            Where to watch?
          </span>
        </div>
        <span className="text-[10px] tracking-widest text-white/70 uppercase">
          {region}
        </span>
      </div>

      {providerList.length > 0 ? (
        <div className="flex flex-col">
          {providerList.map((provider) => (
            <div
              key={`${provider.provider_id}-${provider.type}`}
              className="flex items-center justify-between gap-2 border-b border-white/10 p-4 pr-4 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={`${TMDB_IMG}/w154${provider.logo_path}`}
                  alt={provider.provider_name}
                  className="h-7 w-7 shrink-0  object-cover rounded-[8px]"
                />
                <span className="truncate text-[14px] font-medium">
                  {provider.provider_name}
                </span>
              </div>
              <span className="text-[10px] font-semibold tracking-widest text-white/50 uppercase">
                {provider.type}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11px] font-medium tracking-wide text-white/70 center p-4">
          Watch providers are not available for this region
        </div>
      )}
    </div>
  )
}
