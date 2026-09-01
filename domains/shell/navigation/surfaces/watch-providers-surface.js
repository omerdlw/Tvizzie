'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { requestJson } from '@/shared';
import { INFO_ACTION_TONE_CLASS, SUCCESS_ACTION_TONE_CLASS, TMDB_IMG, WARNING_ACTION_TONE_CLASS } from '@/shared';
import {
  DEFAULT_WATCH_REGION,
  normalizeWatchRegion,
  resolveWatchRegionFromBrowser,
} from '@/infrastructure/tmdb/client';
import { NAV_BUTTON_TRANSITION, navFadeVariants, navListItemVariants } from '@/modules/nav';
import { useSurfaceHeader } from '@/modules/nav';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { Button, Select } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/ui/class-names';
import React from 'react';

const UNKNOWN_REGION_CODES = new Set(['A1', 'A2', 'AP', 'EU', 'T1', 'XX']);

const PROVIDER_CATEGORIES = Object.freeze([
  { key: 'ALL', label: 'All' },
  { key: 'STREAM', label: 'Stream' },
  { key: 'RENT', label: 'Rent' },
  { key: 'BUY', label: 'Buy' },
  { key: 'FREE', label: 'Free' },
]);

const CATEGORY_CONFIG = Object.freeze({
  STREAM: {
    label: 'Stream',
    subtitle: 'Subscription',
    icon: 'solar:play-bold',
    buttonClass: SUCCESS_ACTION_TONE_CLASS
  },
  RENT: {
    label: 'Rent',
    subtitle: 'Rent',
    icon: 'solar:tag-price-bold',
    buttonClass: WARNING_ACTION_TONE_CLASS
  },
  BUY: {
    label: 'Buy',
    subtitle: 'Buy',
    icon: 'solar:bag-check-bold',
    buttonClass: INFO_ACTION_TONE_CLASS
  },
  FREE: {
    label: 'Free',
    subtitle: 'Free streaming',
    icon: 'solar:gift-bold',
    buttonClass:
      'ring-violet-500/30 bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 hover:ring-violet-500/50 hover:text-violet-200',
  },
  ADS: {
    label: 'With Ads',
    subtitle: 'Free with ads',
    icon: 'solar:tv-bold',
    buttonClass:
      'ring-indigo-500/30 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 hover:ring-indigo-500/50 hover:text-indigo-200',
  },
});

const SURFACE_LIST_VARIANTS = navFadeVariants;
const SURFACE_LIST_ITEM_VARIANTS = navListItemVariants;

export function getProviderDeepLink({ providerId, providerName, title, region = 'US' }) {
  const cleanTitle = String(title || '').trim();
  const encodedTitle = encodeURIComponent(cleanTitle);
  const name = String(providerName || '').toLowerCase();
  const id = Number(providerId);

  if (id === 8 || id === 1796 || name.includes('netflix')) {
    return `https://www.netflix.com/search?q=${encodedTitle}`;
  }
  if (
    id === 9 ||
    id === 10 ||
    id === 119 ||
    id === 130 ||
    id === 2100 ||
    name.includes('prime') ||
    name.includes('amazon')
  ) {
    return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodedTitle}`;
  }
  if (id === 2 || id === 350 || name.includes('apple') || name.includes('itunes')) {
    return `https://tv.apple.com/search?term=${encodedTitle}`;
  }
  if (id === 3 || id === 192 || name.includes('google') || name.includes('play movies')) {
    return `https://play.google.com/store/search?q=${encodedTitle}&c=movies`;
  }
  if (name.includes('youtube')) {
    return `https://www.youtube.com/results?search_query=${encodedTitle}+full+movie`;
  }
  if (id === 337 || name.includes('disney')) {
    return `https://www.disneyplus.com/search?q=${encodedTitle}`;
  }
  if (id === 384 || id === 1899 || name.includes('max') || name.includes('hbo')) {
    return `https://play.max.com/search?q=${encodedTitle}`;
  }
  if (id === 344 || name.includes('tv+') || name.includes('tvplus')) {
    return `https://tvplus.com.tr/arama?q=${encodedTitle}`;
  }
  if (id === 341 || name.includes('blutv')) {
    return `https://www.blutv.com/arama?q=${encodedTitle}`;
  }
  if (id === 564 || name.includes('gain')) {
    return `https://www.gain.tv/arama?q=${encodedTitle}`;
  }
  if (id === 693 || id === 1870 || name.includes('tod') || name.includes('bein')) {
    return `https://www.todtv.com.tr/arama?q=${encodedTitle}`;
  }
  if (id === 11 || id === 201 || name.includes('mubi')) {
    return `https://mubi.com/search?query=${encodedTitle}`;
  }
  if (id === 531 || id === 582 || name.includes('paramount')) {
    return `https://www.paramountplus.com/search/?query=${encodedTitle}`;
  }
  if (id === 386 || id === 387 || name.includes('peacock')) {
    return `https://www.peacocktv.com/search?q=${encodedTitle}`;
  }
  if (id === 15 || name.includes('hulu')) {
    return `https://www.hulu.com/search?q=${encodedTitle}`;
  }
  if (id === 283 || name.includes('crunchyroll')) {
    return `https://www.crunchyroll.com/search?q=${encodedTitle}`;
  }
  if (id === 73 || name.includes('tubi')) {
    return `https://tubitv.com/search/${encodedTitle}`;
  }
  if (id === 300 || name.includes('pluto')) {
    return `https://pluto.tv/search/details?q=${encodedTitle}`;
  }
  if (id === 7 || id === 332 || name.includes('vudu') || name.includes('fandango')) {
    return `https://www.vudu.com/content/movies/search?searchString=${encodedTitle}`;
  }
  if (id === 68 || name.includes('microsoft')) {
    return `https://www.microsoft.com/search/shop/movies-and-tv?q=${encodedTitle}`;
  }
  if (id === 593 || name.includes('exxen')) {
    return `https://www.exxen.com/tr/search?q=${encodedTitle}`;
  }
  const safeRegion = String(region || 'us').toLowerCase();
  return `https://www.justwatch.com/${safeRegion}/search?q=${encodedTitle}`;
}

function getRegionDisplayName(regionCode) {
  if (!regionCode) return '';
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(regionCode) || regionCode;
  } catch {
    return regionCode;
  }
}

function getRegionFlag(regionCode) {
  if (!regionCode || regionCode.length !== 2) return '🌐';
  try {
    const codePoints = regionCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}

function getProviderSubtitle(types = [], activeCategory = 'ALL') {
  if (activeCategory !== 'ALL') {
    const config = CATEGORY_CONFIG[activeCategory];
    return config?.subtitle || 'Available';
  }
  const hasStream = types.includes('STREAM');
  const hasRent = types.includes('RENT');
  const hasBuy = types.includes('BUY');
  const hasFree = types.includes('FREE') || types.includes('ADS');

  if (hasStream && hasRent && hasBuy) return 'Stream, rent or buy';
  if (hasStream && hasRent) return 'Stream or rent';
  if (hasStream) return 'Included with subscription';
  if (hasRent && hasBuy) return 'Rent or purchase';
  if (hasRent) return 'Available to rent';
  if (hasBuy) return 'Available to purchase';
  if (hasFree) return 'Free streaming';
  return 'Available';
}

function aggregateProviders(regionalData) {
  if (!regionalData) return [];

  const providerMap = new Map();

  const addCategoryItems = (items, type) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if (!item?.provider_id || !item?.provider_name) return;
      const id = item.provider_id;
      if (!providerMap.has(id)) {
        providerMap.set(id, {
          id: item.provider_id,
          name: item.provider_name,
          logoPath: item.logo_path,
          displayPriority: item.display_priority ?? 999,
          types: [],
        });
      }
      const entry = providerMap.get(id);
      if (!entry.types.includes(type)) {
        entry.types.push(type);
      }
    });
  };

  addCategoryItems(regionalData.flatrate, 'STREAM');
  addCategoryItems(regionalData.free, 'FREE');
  addCategoryItems(regionalData.ads, 'ADS');
  addCategoryItems(regionalData.rent, 'RENT');
  addCategoryItems(regionalData.buy, 'BUY');

  return Array.from(providerMap.values()).sort((a, b) => a.displayPriority - b.displayPriority);
}

function handleListWheel(event) {
  const listViewport = event.currentTarget;
  if (!listViewport || listViewport.scrollHeight <= listViewport.clientHeight) return;

  event.preventDefault();
  event.stopPropagation();

  const maxScrollTop = listViewport.scrollHeight - listViewport.clientHeight;
  listViewport.scrollTop = Math.min(
    maxScrollTop,
    Math.max(0, listViewport.scrollTop + event.deltaY),
  );
}

async function requestWatchRegion() {
  return requestJson('/api/tmdb/watch-region', { retryCount: 0 });
}

export function createWatchProvidersSurfaceEntry(data = {}, config = {}) {
  const providers = data?.providers || data;
  const media = data?.media || null;
  const posterPath =
    media?.poster_path || media?.posterPath || data?.posterPath || data?.poster_path || null;
  const title = data?.title || media?.title || media?.name || 'Where to Watch';
  const icon = posterPath ? `${TMDB_IMG}/w342${posterPath}` : undefined;

  return {
    component: WatchProvidersSurface,
    description: data?.description || 'Streaming, rent and buy options',
    icon,
    props: { data: { providers, media, title, ...data } },
    title,
    ...config,
  };
}

export default function WatchProvidersSurface({ close, data, providers, ...restProps }) {
  const resolvedProvidersData = providers || data?.providers || data || restProps?.providers;
  const mediaTitle =
    data?.title || data?.media?.title || data?.media?.name || data?.name || restProps?.title || '';

  const [activeCategory, setActiveCategory] = useState('ALL');

  const [resolvedRegion, setResolvedRegion] = useState(
    () => resolveWatchRegionFromBrowser() || DEFAULT_WATCH_REGION,
  );
  const allRegionsWithData = useMemo(() => {
    const results = resolvedProvidersData?.results || {};
    return Object.keys(results).filter(
      (code) => Boolean(code) && code.length === 2 && !UNKNOWN_REGION_CODES.has(code),
    );
  }, [resolvedProvidersData?.results]);

  const selectableRegions = useMemo(() => {
    const set = new Set(allRegionsWithData);
    if (resolvedRegion) {
      set.add(resolvedRegion);
    }
    return Array.from(set).sort((a, b) => {
      if (a === resolvedRegion) return -1;
      if (b === resolvedRegion) return 1;
      return a.localeCompare(b);
    });
  }, [allRegionsWithData, resolvedRegion]);

  const regionOptions = useMemo(() => {
    return selectableRegions.map((code) => {
      const hasData = allRegionsWithData.includes(code);
      return {
        value: code,
        label: `${getRegionFlag(code)} ${code} - ${getRegionDisplayName(code)}${!hasData ? ' (N/A)' : ''}`,
      };
    });
  }, [selectableRegions, allRegionsWithData]);

  useEffect(() => {
    let isActive = true;
    const browserRegion = resolveWatchRegionFromBrowser();
    if (browserRegion) {
      setResolvedRegion(browserRegion);
    }
    void requestWatchRegion()
      .then((payload) => {
        if (!isActive) return;
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

  const regionalProviders = resolvedProvidersData?.results?.[resolvedRegion];
  const aggregatedProviders = useMemo(
    () => aggregateProviders(regionalProviders),
    [regionalProviders],
  );

  const categoryCounts = useMemo(() => {
    const counts = { ALL: aggregatedProviders.length };
    aggregatedProviders.forEach((p) => {
      p.types.forEach((type) => {
        const catKey = type === 'ADS' ? 'FREE' : type;
        counts[catKey] = (counts[catKey] || 0) + 1;
      });
    });
    return counts;
  }, [aggregatedProviders]);

  const availableCategories = useMemo(() => {
    return PROVIDER_CATEGORIES.filter((cat) => {
      if (cat.key === 'ALL') return true;
      return Boolean(categoryCounts[cat.key]);
    });
  }, [categoryCounts]);

  const filteredProviders = useMemo(() => {
    if (activeCategory === 'ALL') return aggregatedProviders;
    if (activeCategory === 'FREE') {
      return aggregatedProviders.filter((p) => p.types.includes('FREE') || p.types.includes('ADS'));
    }
    return aggregatedProviders.filter((p) => p.types.includes(activeCategory));
  }, [aggregatedProviders, activeCategory]);

  const justWatchLink = regionalProviders?.link || null;
  const posterPath =
    data?.media?.poster_path ||
    data?.media?.posterPath ||
    data?.posterPath ||
    data?.poster_path ||
    restProps?.posterPath ||
    null;
  const posterIcon = posterPath ? `${TMDB_IMG}/w342${posterPath}` : undefined;

  const setHeader = useSurfaceHeader();
  useEffect(() => {
    if (!setHeader) return;
    const count = filteredProviders.length;
    const countLabel = `${count} ${count === 1 ? 'provider' : 'providers'}`;
    const regionName = getRegionDisplayName(resolvedRegion) || resolvedRegion;
    setHeader({
      icon: posterIcon,
      title: mediaTitle || 'Where to Watch',
      description: `${regionName} · ${countLabel}`,
    });
  }, [setHeader, posterIcon, mediaTitle, resolvedRegion, filteredProviders.length]);

  return (
    <div className="flex w-full flex-col gap-2.5 overflow-hidden">
      <div className="flex items-center justify-between gap-2.5">
        {availableCategories.length > 1 ? (
          <div className="flex h-8 min-w-0 flex-1 scrollbar-none items-center gap-1.5 overflow-x-auto">
            {availableCategories.map((cat) => {
              const isActive = activeCategory === cat.key;
              const count = categoryCounts[cat.key] || 0;
              return (
                <Button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={cn(
                    'flex h-full shrink-0 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition-all duration-200 select-none',
                    isActive
                      ? 'bg-white text-black'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <span>{cat.label}</span>
                  <span
                    className={cn(
                      'text-xs font-bold',
                      isActive ? 'text-black/80' : 'text-white/40',
                    )}
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
        ) : null}
        {selectableRegions.length > 0 && (
          <div className="relative flex shrink-0 items-center">
            <Select
              value={resolvedRegion}
              onChange={(value) => {
                setResolvedRegion(value);
                setActiveCategory('ALL');
              }}
              options={regionOptions}
              side="bottom"
              align="end"
              aria-label="Select watch region"
              classNames={{
                trigger:
                  'flex h-8 items-center gap-2 rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 px-2.5 text-xs font-semibold text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white',
                value:'flex items-center gap-1 text-xs font-bold text-white uppercase',
                menu: 'max-h-60 overflow-y-auto ring-1 ring-inset ring-white/10 bg-black p-1',
                optionsList: 'flex flex-col gap-1',
                option:
                  'cursor-pointer p-2 text-xs font-medium text-white/70 outline-none data-[highlighted]:bg-white/10 data-[highlighted]:text-white',
                optionActive: 'bg-white/10 text-white font-semibold',
                indicator: 'ml-auto text-white',
                icon: 'text-white/40 text-xs',
              }}
            />
          </div>
        )}
      </div>
      {filteredProviders.length > 0 ? (
        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          onWheel={handleListWheel}
          className="scrollbar-none max-h-[min(54dvh,24rem)] w-full touch-pan-y overflow-y-auto overscroll-contain rounded-[20px]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`list-${resolvedRegion}-${activeCategory}`}
              variants={SURFACE_LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex w-full flex-col gap-4 overflow-visible"
            >
              {filteredProviders.map((provider, index) => {
                const displayTypes =
                  activeCategory === 'ALL'
                    ? provider.types
                    : activeCategory === 'FREE'
                      ? provider.types.filter((t) => t === 'FREE' || t === 'ADS')
                      : provider.types.filter((t) => t === activeCategory);

                return (
                  <motion.div
                    key={provider.id}
                    variants={SURFACE_LIST_ITEM_VARIANTS}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={index}
                    className="group relative flex h-10 w-full items-center justify-between gap-2.5 transition-all duration-300 ease-in-out"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-[20px] bg-black">
                        <AdaptiveImage
                          mode="img"
                          src={`${TMDB_IMG}/w154${provider.logoPath}`}
                          alt={provider.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          wrapperClassName="h-full w-full"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-center -space-y-0.5">
                        <span className="truncate text-xs font-semibold transition-colors">
                          {provider.name}
                        </span>
                        <span className="truncate text-xs font-medium text-white/40">
                          {getProviderSubtitle(provider.types, activeCategory)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {displayTypes.map((type) => {
                        const config = CATEGORY_CONFIG[type] || CATEGORY_CONFIG.STREAM;
                        const deepLink = getProviderDeepLink({
                          providerId: provider.id,
                          providerName: provider.name,
                          title: mediaTitle,
                          region: resolvedRegion,
                          type,
                        });

                        return (
                          <motion.a
                            key={type}
                            href={deepLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            whileTap={{ scale: 0.98 }}
                            transition={NAV_BUTTON_TRANSITION}
                            style={{
                              transformOrigin: 'center center',
                              transitionProperty:
                                'background-color, color, border-color, box-shadow, opacity',
                            }}
                            className={cn(
                              'inline-flex h-10 items-center gap-1.5 rounded-[20px] ring-1 ring-inset px-3.5 text-xs font-bold uppercase',
                              config.buttonClass,
                            )}
                            title={`Open ${provider.name} (${config.label})`}
                          >
                            <Icon icon={config.icon} size={12} />
                            <span>{config.label}</span>
                            <Icon
                              icon="solar:arrow-right-up-linear"
                              size={12}
                              className="text-white/70"
                            />
                          </motion.a>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div
          key={`empty-${resolvedRegion}-${activeCategory}`}
          className="flex min-h-[10rem] w-full flex-col items-center justify-center gap-2.5 rounded-[20px] ring-1 ring-inset  ring-white/10 bg-white/5 p-6 text-center"
        >
          <div className="center size-10 rounded-xl ring-1 ring-inset ring-white/10 bg-white/5 text-white/40">
            <Icon icon="solar:tv-broken" size={22} />
          </div>
          <div className="flex max-w-sm flex-col gap-1">
            <p className="text-xs font-semibold text-white/70">
              Not available in {getRegionDisplayName(resolvedRegion) || resolvedRegion}{' '}
              {getRegionFlag(resolvedRegion)}
            </p>
            <p className="text-xs leading-relaxed text-white/40">
              {allRegionsWithData.length > 0
                ? 'Watch provider data is not available in this region. You can switch to one of the available regions below:'
                : 'Watch provider data is currently not available for this title in any region.'}
            </p>
          </div>

          {allRegionsWithData.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
              {allRegionsWithData.slice(0, 8).map((code) => (
                <Button
                  key={code}
                  type="button"
                  onClick={() => {
                    setResolvedRegion(code);
                    setActiveCategory('ALL');
                  }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white"
                >
                  <span className="text-sm leading-none">{getRegionFlag(code)}</span>
                  <span>{getRegionDisplayName(code) || code}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
