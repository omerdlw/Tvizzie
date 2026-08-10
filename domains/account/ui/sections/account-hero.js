'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn, resolveVersionedImageUrl } from '@/shared/utils';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from '@/domains/account/utils';
import Link from 'next/link';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import { BlurryText } from '@/ui/motion/animations/blurry-text';
import {
  heroAvatarVariants,
  heroBioVariants,
  getHeroStatProps,
} from '@/app/(account)/motion';

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

function HeroInlineMetric({ item, className = '', labelClassName = '', valueClassName = '', index = 0 }) {
  const statProps = getHeroStatProps(index);
  const content = (
    <>
      <span className={valueClassName}>{item.value}</span>
      <span className={labelClassName}>{item.label}</span>
    </>
  );
  const wrapperClassName = cn(className, (item.href || typeof item.onClick === 'function') && '');
  if (item.href) {
    return (
      <motion.div {...statProps}>
        <Link href={item.href} className={wrapperClassName}>
          {content}
        </Link>
      </motion.div>
    );
  }
  if (typeof item.onClick === 'function') {
    return (
      <motion.div {...statProps}>
        <button
          type="button"
          onClick={item.onClick}
          className={cn('border-0 bg-transparent p-0 text-left', wrapperClassName)}
        >
          {content}
        </button>
      </motion.div>
    );
  }
  return (
    <motion.span {...statProps} className={wrapperClassName}>
      {content}
    </motion.span>
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
        className="line-clamp-3 text-sm leading-relaxed text-pretty text-black/70 sm:text-base sm:leading-7 break-words"
      >
        {description}
      </p>

      {shouldShowReadMore ? (
        <button
          className="mt-1 cursor-pointer text-[11px] font-semibold tracking-widest text-black/70 uppercase hover:text-black transition-colors"
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
  const heroDisplayName = String(profile?.displayName || '').trim() || 'Account';
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

  const allHeroMetrics = [...heroCountItems, ...heroStats].map((item) => ({
    ...item,
    value: formatHeroCount(item.value),
  }));

  const heroAvatarSrc = getUserAvatarUrl(profile);
  const heroAvatarFallbackSrc = getUserAvatarFallbackUrl(profile);

  return (
    <section className="relative flex w-full flex-col items-center gap-5 text-center sm:gap-7 lg:gap-8 py-2 sm:py-4">
      {/* Avatar & Title Row */}
      <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
        <motion.div
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-white/40 backdrop-blur-md sm:h-16 sm:w-16 lg:h-20 lg:w-20"
          initial={false}
          animate={heroAvatarVariants.animate}
          transition={heroAvatarVariants.transition}
        >
          <AdaptiveImage
            mode="img"
            className="h-full w-full rounded-2xl object-cover"
            src={heroAvatarSrc}
            alt={heroDisplayName}
            decoding="async"
            onError={(event) => applyAvatarFallback(event, heroAvatarFallbackSrc)}
            wrapperClassName="h-full w-full rounded-2xl"
          />
        </motion.div>

        <h1 className="font-zuume max-w-full text-5xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-7xl lg:text-8xl text-left text-black">
          {heroDisplayName}
        </h1>
      </div>

      {/* Plain Text Stats Under Title */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-2 text-sm sm:text-base">
        {allHeroMetrics.map((item, index) => (
          <HeroInlineMetric
            key={`${item.label}-${item.value}-${index}`}
            item={item}
            index={index}
            className="inline-flex items-baseline gap-1.5 whitespace-nowrap text-black/80 hover:text-black transition-colors"
            valueClassName="font-semibold text-black leading-none tracking-tight"
            labelClassName="text-black/75 leading-none"
          />
        ))}
      </div>

      {/* Biography */}
      {profile?.description ? (
        <motion.div initial={false} animate={heroBioVariants.animate} transition={heroBioVariants.transition} className="mx-auto max-w-[72ch] w-full px-4">
          <HeroBioPreview description={profile.description} onReadMore={onReadMore} />
        </motion.div>
      ) : null}
    </section>
  );
}
