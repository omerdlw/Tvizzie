'use client';

import { useMemo } from 'react';

import { TMDB_IMG } from '@/core/constants';

const MAX_WATCH_PROVIDERS = 6;
const DEFAULT_REGION = 'TR';

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

export default function WatchProvidersSurface({ providers, region = DEFAULT_REGION }) {
  const regionalProviders = providers?.results?.[region];

  const providerList = useMemo(() => buildProviderList(regionalProviders), [regionalProviders]);

  return (
    <div className={`flex w-full flex-col overflow-hidden rounded-[12px] border border-black/10`}>
      <div className={`flex items-center justify-between gap-2 p-4`}>
        <div className="flex min-w-0 items-baseline gap-2">
          <span className={`text-[11px] font-bold tracking-wider uppercase`}>Where to watch?</span>
        </div>
        <span className={`text-[10px] tracking-widest text-black/60 uppercase`}>{region}</span>
      </div>

      {providerList.length > 0 ? (
        <div className="flex flex-col">
          {providerList.map((provider) => (
            <div
              key={`${provider.provider_id}-${provider.type}`}
              className={`flex items-center justify-between gap-2 border-b border-black/10 p-4 pr-4 last:border-b-0`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={`${TMDB_IMG}/w154${provider.logo_path}`}
                  alt={provider.provider_name}
                  className="h-7 w-7 shrink-0 rounded-[8px] object-cover"
                />
                <span className={`truncate text-[14px] font-medium text-black/70`}>{provider.provider_name}</span>
              </div>
              <span
                className={`bg-primary rounded-[8px] border border-black/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-black/60 uppercase`}
              >
                {provider.type}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={`center border-t border-black/10 p-4 text-xs`}>
          Watch providers are not available for this region
        </div>
      )}
    </div>
  );
}
