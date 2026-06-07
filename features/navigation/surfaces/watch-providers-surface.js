'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TMDB_IMG } from '@/core/constants';
import { useSurfaceHeader } from '@/features/navigation/surfaces/surface-shell';
import {
  DEFAULT_WATCH_REGION,
  normalizeWatchRegion,
  resolveWatchRegionFromBrowser,
} from '@/core/services/tmdb/watch-region';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { getNavActionItemMotion } from '@/core/modules/motion';

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
  const [resolvedRegion, setResolvedRegion] = useState(() => resolveWatchRegionFromBrowser() || DEFAULT_WATCH_REGION);
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
  const setHeader = useSurfaceHeader();

  useEffect(() => {
    if (setHeader) {
      setHeader({
        icon: 'solar:tv-bold',
        title: 'Where to watch?',
        description: 'Available providers for the selected region',
        trailing: <span className="text-[10px] tracking-widest text-black/50 uppercase">{resolvedRegion}</span>,
      });
    }
  }, [setHeader, resolvedRegion]);

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        {providerList.length > 0 ? (
          <div key={`list-${resolvedRegion}`} className="flex flex-col border-t border-black/10 pt-1">
            {providerList.map((provider, index) => (
              <motion.div
                key={`${provider.provider_id}-${provider.type}`}
                whileTap={{ scale: 0.98 }}
                {...getNavActionItemMotion(index)}
                className="-mx-1.5 sm:-mx-2 flex cursor-pointer items-center justify-between border-b border-black/10 px-1.5 sm:px-2 py-2.5 transition-colors duration-200 ease-in-out last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <AdaptiveImage
                    mode="img"
                    src={`${TMDB_IMG}/w154${provider.logo_path}`}
                    alt={provider.provider_name}
                    loading="lazy"
                    decoding="async"
                    className="h-7 w-7 shrink-0 rounded-[8px] object-cover"
                    wrapperClassName="h-7 w-7 shrink-0 "
                  />
                  <span className="truncate text-sm font-medium text-black/70">{provider.provider_name}</span>
                </div>
                <span className="bg-primary rounded-[8px] border border-black/5 px-2 py-1 text-[10px] font-semibold tracking-wide text-black/50 uppercase">
                  {provider.type}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            key={`empty-${resolvedRegion}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="center p-4 text-sm"
          >
            Watch providers are not available for this region
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
