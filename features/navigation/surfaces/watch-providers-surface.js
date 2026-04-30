'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { TMDB_IMG } from '@/core/constants';
import { NAV_CONTENT_TRANSITION, NAV_SURFACE_ITEM_SPRING, NAV_SURFACE_SPRING } from '@/core/modules/nav/motion';
import {
  DEFAULT_WATCH_REGION,
  normalizeWatchRegion,
  resolveWatchRegionFromBrowser,
} from '@/core/services/tmdb/watch-region';
import AdaptiveImage from '@/ui/elements/adaptive-image';

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
    <motion.div
      className="flex w-full flex-col overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={NAV_SURFACE_SPRING}
      layout="position"
    >
      <div className="flex items-center justify-between gap-2 p-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase">Where to watch?</span>
        </div>
        <span className="text-[10px] tracking-widest text-black/50 uppercase">{resolvedRegion}</span>
      </div>

      {providerList.length > 0 ? (
        <motion.div className="flex flex-col px-1" layout="position" transition={NAV_CONTENT_TRANSITION}>
          {providerList.map((provider, index) => (
            <motion.div
              key={`${provider.provider_id}-${provider.type}`}
              className="flex items-center justify-between border-b border-black/10 py-3 last:border-b-0"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ ...NAV_SURFACE_ITEM_SPRING, delay: Math.min(index * 0.024, 0.1) }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <AdaptiveImage
                  mode="img"
                  src={`${TMDB_IMG}/w154${provider.logo_path}`}
                  alt={provider.provider_name}
                  loading="lazy"
                  decoding="async"
                  className="h-7 w-7 shrink-0  object-cover"
                  wrapperClassName="h-7 w-7 shrink-0 "
                />
                <span className={`truncate text-sm font-medium text-black/70`}>{provider.provider_name}</span>
              </div>
              <span
                className={`bg-primary  border border-black/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-black/50 uppercase`}
              >
                {provider.type}
              </span>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div className="center p-4 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          Watch providers are not available for this region
        </motion.div>
      )}
    </motion.div>
  );
}
