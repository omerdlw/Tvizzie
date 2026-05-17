'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { TMDB_IMG } from '@/core/constants';
import {
  DEFAULT_WATCH_REGION,
  normalizeWatchRegion,
  resolveWatchRegionFromBrowser,
} from '@/core/services/tmdb/watch-region';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { FEATURE_NAV_ACTION_ROW_MOTION, getFeatureNavActionItemMotion } from '@/features/motion';

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
  const response = await fetch('/api/tmdb?action=watch-region', {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default function WatchProvidersSurface({ providers }) {
  const [resolvedRegion, setResolvedRegion] = useState(DEFAULT_WATCH_REGION);
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
      .catch(() => {
        // Keep the browser/default region if the geo endpoint is unavailable.
      });

    return () => {
      isActive = false;
    };
  }, []);

  const providerList = useMemo(() => buildProviderList(regionalProviders), [regionalProviders]);

  return (
    <motion.div className="flex w-full flex-col overflow-hidden" {...FEATURE_NAV_ACTION_ROW_MOTION}>
      <div className="flex items-center justify-between gap-2 p-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase">Where to watch?</span>
        </div>
        <span className="text-[10px] tracking-widest text-white/50 uppercase">{resolvedRegion}</span>
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {providerList.length > 0 ? (
          <motion.div key="watch-providers" className="flex flex-col px-1" {...getFeatureNavActionItemMotion(0)}>
            {providerList.map((provider, index) => (
              <motion.div
                key={`${provider.provider_id}-${provider.type}`}
                className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0"
                {...getFeatureNavActionItemMotion(index)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <AdaptiveImage
                    mode="img"
                    src={`${TMDB_IMG}/w154${provider.logo_path}`}
                    alt={provider.provider_name}
                    loading="lazy"
                    decoding="async"
                    className="h-7 w-7 shrink-0 object-cover"
                    wrapperClassName="h-7 w-7 shrink-0 overflow-hidden "
                  />
                  <span className="truncate text-sm font-medium text-white/70">{provider.provider_name}</span>
                </div>
                <span className="border border-white/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-white/50 uppercase">
                  {provider.type}
                </span>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="watch-providers-empty" className="center p-4 text-sm" {...getFeatureNavActionItemMotion(0)}>
            Watch providers are not available for this region
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
