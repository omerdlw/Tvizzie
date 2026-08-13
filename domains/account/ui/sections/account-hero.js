'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, resolveVersionedImageUrl } from '@/shared/utils';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from '@/domains/account/utils';
import Link from 'next/link';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import { useModal } from '@/modules/modal';
import { useAuth } from '@/modules/auth';
import { AccountReveal } from '@/app/(account)/motion';
function formatHeroCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

function createHeroCollectionMetaItem(count, singular, plural = `${singular}s`, options = {}) {
  const safeCount = Number(count) || 0;
  return {
    ...options,
    label: safeCount === 1 ? singular : plural,
    value: formatHeroCount(safeCount),
  };
}

function HeroInlineMetric({
  item,
  className = '',
  labelClassName = '',
  valueClassName = '',
  index = 0,
}) {
  const content = (
    <>
      <span className={valueClassName}>{item.value}</span>
      <span className={labelClassName}>{item.label}</span>
    </>
  );
  const wrapperClassName = cn(className, (item.href || typeof item.onClick === 'function') && '');
  if (item.href) {
    return (
      <AccountReveal interactive itemIndex={index} stage="hero.metric">
        <Link href={item.href} className={wrapperClassName}>
          {content}
        </Link>
      </AccountReveal>
    );
  }
  if (typeof item.onClick === 'function') {
    return (
      <AccountReveal interaction="control" interactive itemIndex={index} stage="hero.metric">
        <button
          type="button"
          onClick={item.onClick}
          className={cn('cursor-pointer border-0 bg-transparent p-0 text-left', wrapperClassName)}
        >
          {content}
        </button>
      </AccountReveal>
    );
  }
  return (
    <AccountReveal itemIndex={index} stage="hero.metric">
      <span className={wrapperClassName}>{content}</span>
    </AccountReveal>
  );
}

function HeroBioPreview({ description, onReadMore }) {
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const shouldShowReadMore = isOverflowing && typeof onReadMore === 'function';

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement || !description) {
      setIsOverflowing(false);
      return;
    }
    const updateOverflowState = () => {
      setIsOverflowing(textElement.scrollHeight > textElement.clientHeight + 1);
    };
    updateOverflowState();
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateOverflowState).catch(() => {});
    }
    if (typeof ResizeObserver !== 'function') {
      return;
    }
    const observer = new ResizeObserver(updateOverflowState);
    observer.observe(textElement);
    return () => observer.disconnect();
  }, [description]);

  if (!description) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center gap-2 text-center">
      <p
        ref={textRef}
        className="line-clamp-3 text-sm leading-relaxed text-pretty break-words text-black/70 sm:text-base sm:leading-7"
      >
        {description}
      </p>

      {shouldShowReadMore ? (
        <button
          className="mt-1 cursor-pointer text-[11px] font-semibold tracking-widest text-black/70 uppercase transition-[color,transform] duration-300 ease-out hover:scale-[1.02] hover:text-black active:scale-[0.97]"
          type="button"
          onClick={onReadMore}
        >
          Read More
        </button>
      ) : null}
    </div>
  );
}

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
  const auth = useAuth();
  const { openModal } = useModal();
  const heroDisplayName = String(profile?.displayName || '').trim() || 'Account';
  const resolvedWatchedCount =
    watchedCount !== null && watchedCount !== undefined && Number.isFinite(Number(watchedCount))
      ? Number(watchedCount)
      : Number(profile?.watchedCount || 0);

  const handleFollowListClick = (type) => {
    if (typeof onOpenFollowList === 'function') {
      onOpenFollowList(type);
      return;
    }
    const targetUserId = profile?.id;
    if (!targetUserId) return;
    openModal(
      'ACCOUNT_SOCIAL_MODAL',
      { desktop: 'center', mobile: 'bottom' },
      {
        data: {
          canManageRequests: Boolean(auth.user?.id === targetUserId && profile?.isPrivate),
          userId: targetUserId,
          tab: type,
        },
      },
    );
  };

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
      onClick: () => handleFollowListClick('following'),
      value: followingCount,
    },
    {
      label: 'Followers',
      onClick: () => handleFollowListClick('followers'),
      value: followerCount,
    },
  ];

  const allHeroMetrics = [...heroCountItems, ...heroStats].map((item) => ({
    ...item,
    value: formatHeroCount(item.value),
  }));

  const heroAvatarSrc = getUserAvatarUrl(profile);
  const heroAvatarFallbackSrc = getUserAvatarFallbackUrl(profile);

  return (
    <section className="relative flex w-full flex-col items-center gap-5 py-2 text-center sm:gap-7 sm:py-4 lg:gap-8">
      {/* Avatar & Title Row */}
      <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
        <AccountReveal stage="hero.avatar">
          <div className="group relative h-12 w-12 shrink-0 overflow-hidden bg-white/40 backdrop-blur-md sm:h-16 sm:w-16 lg:h-20 lg:w-20">
            <AdaptiveImage
              mode="img"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              src={heroAvatarSrc}
              alt={heroDisplayName}
              decoding="async"
              onError={(event) => applyAvatarFallback(event, heroAvatarFallbackSrc)}
              wrapperClassName="h-full w-full "
            />
          </div>
        </AccountReveal>

        <AccountReveal stage="hero.title">
          <h1 className="font-zuume max-w-full text-left text-5xl leading-none font-bold [overflow-wrap:anywhere] text-black uppercase sm:text-7xl lg:text-8xl">
            {heroDisplayName}
          </h1>
        </AccountReveal>
      </div>

      {/* Plain Text Stats Under Title */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-2 text-sm sm:text-base">
        {allHeroMetrics.map((item, index) => (
          <HeroInlineMetric
            key={`${item.label}-${item.value}-${index}`}
            item={item}
            index={index}
            className="inline-flex items-baseline gap-1.5 whitespace-nowrap text-black/80 hover:text-black"
            valueClassName="font-semibold text-black leading-none tracking-tight"
            labelClassName="text-black/70 leading-none"
          />
        ))}
      </div>

      {/* Biography */}
      {profile?.description ? (
        <AccountReveal className="mx-auto w-full max-w-[72ch] px-4" stage="hero.bio">
          <HeroBioPreview description={profile.description} onReadMore={onReadMore} />
        </AccountReveal>
      ) : null}
    </section>
  );
}
