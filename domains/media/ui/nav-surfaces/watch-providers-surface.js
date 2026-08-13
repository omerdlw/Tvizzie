'use client';

import { useEffect, useMemo, useState } from 'react';
import { TMDB_IMG } from '@/shared/constants';
import {
  DEFAULT_WATCH_REGION,
  normalizeWatchRegion,
  resolveWatchRegionFromBrowser,
} from '@/infrastructure/tmdb/services/watch-region';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
const MAX_WATCH_PROVIDERS = 6;

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
  ];
  const uniqueProviders = [];
  const seen = new Set();
  providers.forEach((provider) => {
    const key = `${provider.provider_id}-${provider.type}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    uniqueProviders.push(provider);
  });
  return uniqueProviders.slice(0, MAX_WATCH_PROVIDERS);
}

async function requestWatchRegion() {
  const response = await fetch('/api/tmdb/watch-region', {
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export default function WatchProvidersSurface({ close, providers }) {
  const [resolvedRegion, setResolvedRegion] = useState(
    () => resolveWatchRegionFromBrowser() || DEFAULT_WATCH_REGION,
  );
  const regionalProviders = providers?.results?.[resolvedRegion];

  useEffect(() => {
    let isActive = true;
    const browserRegion = resolveWatchRegionFromBrowser();
    if (browserRegion) {
      setResolvedRegion(browserRegion);
    }
    void requestWatchRegion()
      .then((payload) => {
        if (!isActive) {
          return;
        }
        const apiRegion = normalizeWatchRegion(payload?.region);
        const nextRegion = payload?.source === 'geo' ? apiRegion : browserRegion || apiRegion;
        if (nextRegion) {
          setResolvedRegion(nextRegion);
        }
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
  }, []);

  const providerList = useMemo(() => buildProviderList(regionalProviders), [regionalProviders]);

  return (
    <div className="flex w-full flex-col overflow-hidden">
      {providerList.length > 0 ? (
        <div key={`list-${resolvedRegion}`} className="flex flex-col gap-1">
          {providerList.map((provider) => (
            <div
              key={`${provider.provider_id}-${provider.type}`}
              className="-mx-1 flex cursor-pointer items-center justify-between border-b border-black/5 px-2.5 py-2 first:pt-0 last:border-b-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-2">
                <AdaptiveImage
                  mode="img"
                  src={`${TMDB_IMG}/w154${provider.logo_path}`}
                  alt={provider.provider_name}
                  loading="lazy"
                  decoding="async"
                  className="h-7 w-7 shrink-0 object-cover"
                  wrapperClassName="h-7 w-7 shrink-0  bg-black/5"
                />
                <span className="truncate text-sm font-medium text-black/70">
                  {provider.provider_name}
                </span>
              </div>
              <span className="bg-primary border border-black/5 px-2 py-1 text-[10px] font-semibold tracking-wide text-black/50 uppercase">
                {provider.type}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div key={`empty-${resolvedRegion}`} className="center bg-primary p-4 text-sm">
          Watch providers are not available for this region
        </div>
      )}
    </div>
  );
}
