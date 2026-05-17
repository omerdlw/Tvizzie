'use client';

import { cn } from '@/core/utils';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
  resolveVersionedImageUrl,
} from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/core/constants';
import HeroBioPreview from './bio';
import {
  HeroRevealItem,
  HeroStatsGrid,
  HeroTextContent,
  createHeroCollectionMetaItem,
  formatHeroCount,
} from './metrics';

const ACCOUNT_HERO_HEIGHT_CLASS = 'min-h-[460px] sm:min-h-[620px] lg:min-h-[600px]';
const ACCOUNT_HERO_IMAGE_CLASS = 'h-full w-full object-cover object-[center_24%] sm:object-[center_28%] lg:object-[center_32%]';
const ACCOUNT_HERO_BANNER_WRAPPER_CLASS = 'mx-auto h-full w-full opacity-50';
const ACCOUNT_HERO_BOTTOM_GRADIENT_CLASS = 'pointer-events-none absolute inset-x-0 bottom-0 h-[56%] sm:h-[52%]';
const ACCOUNT_HERO_EDGE_GRADIENT_CLASS = 'pointer-events-none absolute inset-y-0 w-[10%] sm:w-[14%] lg:w-[18%]';
const ACCOUNT_HERO_BOTTOM_GRADIENT_STYLE = Object.freeze({
  backgroundImage: `linear-gradient(
      to bottom,
      color-mix(in srgb, var(--white) 0%, transparent) 0%,
      color-mix(in srgb, var(--white) 14%, transparent) 24%,
      color-mix(in srgb, var(--white) 54%, transparent) 64%,
      color-mix(in srgb, var(--white) 88%, transparent) 92%,
      var(--white) 100%
    )`,
});
const ACCOUNT_HERO_LEFT_EDGE_GRADIENT_STYLE = Object.freeze({
  backgroundImage: `linear-gradient(
      to right,
      var(--white) 0%,
      color-mix(in srgb, var(--white) 72%, transparent) 38%,
      color-mix(in srgb, var(--white) 22%, transparent) 72%,
      color-mix(in srgb, var(--white) 0%, transparent) 100%
    )`,
});
const ACCOUNT_HERO_RIGHT_EDGE_GRADIENT_STYLE = Object.freeze({
  backgroundImage: `linear-gradient(
      to left,
      var(--white) 0%,
      color-mix(in srgb, var(--white) 72%, transparent) 38%,
      color-mix(in srgb, var(--white) 22%, transparent) 72%,
      color-mix(in srgb, var(--white) 0%, transparent) 100%
    )`,
});

export default function AccountHero({
  likesCount = 0,
  followerCount = 0,
  followingCount = 0,
  listsCount = 0,
  onOpenFollowList = null,
  onReadMore,
  profile = null,
  watchedCount = null,
  watchlistCount = 0,
}) {
  const heroDisplayName = String(profile?.displayName || '').trim() || 'Account';
  const heroBannerSrc =
    resolveVersionedImageUrl(String(profile?.bannerUrl || ''))
      .trim()
      .replace(/^(null|undefined)$/i, '') || null;
  const resolvedWatchedCount =
    watchedCount !== null && watchedCount !== undefined && Number.isFinite(Number(watchedCount))
      ? Number(watchedCount)
      : Number(profile?.watchedCount || 0);
  const heroCountItems = [
    createHeroCollectionMetaItem(watchlistCount, 'Watchlist', 'Watchlist', {
      href: profile?.username ? `/account/${profile.username}/watchlist` : null,
    }),
    createHeroCollectionMetaItem(resolvedWatchedCount, 'Watched', 'Watched', {
      href: profile?.username ? `/account/${profile.username}/watched` : null,
    }),
    createHeroCollectionMetaItem(listsCount, 'List', 'Lists', {
      href: profile?.username ? `/account/${profile.username}/lists` : null,
    }),
    createHeroCollectionMetaItem(likesCount, 'Like', 'Likes', {
      href: profile?.username ? `/account/${profile.username}/likes` : null,
    }),
  ].filter(Boolean);
  const heroStats = [
    {
      label: 'Following',
      onClick: typeof onOpenFollowList === 'function' ? () => onOpenFollowList('following') : null,
      value: followingCount,
    },
    {
      label: 'Followers',
      onClick: typeof onOpenFollowList === 'function' ? () => onOpenFollowList('followers') : null,
      value: followerCount,
    },
  ];
  const mobileHeroStats = [...heroCountItems, ...heroStats].map((item) => ({
    ...item,
    value: formatHeroCount(item.value),
  }));
  const heroAvatarSrc = getUserAvatarUrl(profile);
  const heroAvatarFallbackSrc = getUserAvatarFallbackUrl(profile);

  return (
    <section className={`relative w-full overflow-hidden ${ACCOUNT_HERO_HEIGHT_CLASS}`}>
      {heroBannerSrc ? (
        <div className="absolute inset-0">
          <AdaptiveImage
            mode="img"
            src={heroBannerSrc}
            className={ACCOUNT_HERO_IMAGE_CLASS}
            alt={`${heroDisplayName} cover`}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            wrapperClassName={ACCOUNT_HERO_BANNER_WRAPPER_CLASS}
          />
        </div>
      ) : null}
      <div
        className={cn(ACCOUNT_HERO_EDGE_GRADIENT_CLASS, 'left-0')}
        style={ACCOUNT_HERO_LEFT_EDGE_GRADIENT_STYLE}
        aria-hidden="true"
      />
      <div
        className={cn(ACCOUNT_HERO_EDGE_GRADIENT_CLASS, 'right-0')}
        style={ACCOUNT_HERO_RIGHT_EDGE_GRADIENT_STYLE}
        aria-hidden="true"
      />
      <div className={ACCOUNT_HERO_BOTTOM_GRADIENT_CLASS} style={ACCOUNT_HERO_BOTTOM_GRADIENT_STYLE} aria-hidden="true" />
      <div
        className={`${ACCOUNT_ROUTE_SHELL_CLASS} relative z-10 flex ${ACCOUNT_HERO_HEIGHT_CLASS} items-end px-4 pt-18 pb-5 sm:px-8 sm:pt-24 sm:pb-7 lg:pb-8`}
      >
        <div className="flex w-full flex-col gap-2 sm:gap-3">
          <div className="grid w-full gap-y-4 lg:grid-cols-[128px_minmax(0,1fr)_280px] lg:grid-rows-[auto_auto] lg:items-end lg:gap-x-8 lg:gap-y-0">
            <HeroRevealItem className="h-24 w-24 justify-self-start overflow-hidden sm:h-32 sm:w-32 lg:row-span-2 lg:self-end">
              <AdaptiveImage
                mode="img"
                className="h-full w-full object-cover"
                src={heroAvatarSrc}
                alt={heroDisplayName}
                decoding="async"
                onError={(event) => applyAvatarFallback(event, heroAvatarFallbackSrc)}
                wrapperClassName="h-full w-full"
              />
            </HeroRevealItem>

            <div className="lg:col-start-2 lg:row-span-2 lg:self-end">
              <HeroTextContent
                countsLabel={heroCountItems}
                displayName={heroDisplayName}
                mobileStats={mobileHeroStats}
              />
            </div>

            <div className="hidden lg:col-start-3 lg:row-start-2 lg:block lg:self-end lg:justify-self-end">
              <HeroStatsGrid
                stats={heroStats}
                className="grid grid-cols-2 gap-6 text-center"
                itemClassName="inline-flex min-w-0 items-baseline gap-1.5 py-1 whitespace-nowrap lg:flex-col lg:items-center lg:gap-0.5 lg:py-0"
                valueClassName="text-base font-semibold leading-none tracking-tight sm:text-lg lg:text-[2.4rem]"
                labelClassName="text-base leading-none text-white/70 lg:mt-1 lg:text-[9px] lg:uppercase lg:tracking-widest"
              />
            </div>
          </div>
          <div className="w-full lg:pl-[160px]">
            <HeroBioPreview description={profile?.description} onReadMore={onReadMore} />
          </div>
        </div>
      </div>
    </section>
  );
}
