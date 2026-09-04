'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { Button } from '@/ui/primitives';
import { useNavigationActions } from '@/modules/nav';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from '@/domains/account/utils/avatar';
import { createMovieBackdropImageUrl } from '@/domains/media/utils/media-data';
import { createAccountSocialSurfaceEntry } from '@/domains/shell/navigation/surfaces/account-social-surface';
import { createAccountBioSurfaceEntry } from '@/domains/shell/navigation/surfaces/account-bio-surface';
import BackdropHero from '@/ui/components/backdrop-hero';
import Icon from '@/ui/primitives/icon';

function formatHeroCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

function formatHeroJoinDate(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function resolveAccountBackdropUrl(profile) {
  if (profile?.bannerUrl && typeof profile.bannerUrl === 'string' && profile.bannerUrl.trim()) {
    const banner = profile.bannerUrl.trim();
    if (banner.startsWith('http://') || banner.startsWith('https://') || banner.startsWith('/')) {
      return banner;
    }
    return createMovieBackdropImageUrl(banner);
  }
  if (profile?.banner_url && typeof profile.banner_url === 'string' && profile.banner_url.trim()) {
    const banner = profile.banner_url.trim();
    if (banner.startsWith('http://') || banner.startsWith('https://') || banner.startsWith('/')) {
      return banner;
    }
    return createMovieBackdropImageUrl(banner);
  }
  const showcase = Array.isArray(profile?.favoriteShowcase) ? profile.favoriteShowcase : [];
  for (const item of showcase) {
    if (item?.backdrop_path) {
      return createMovieBackdropImageUrl(item.backdrop_path);
    }
  }
  return null;
}

export function AccountBackdropHero({ image }) {
  return (
    <BackdropHero
      image={image}
      position="center 25%"
      className="lg:h-[clamp(28rem,40vw,34rem)] xl:h-[clamp(30rem,42vw,36rem)]"
    />
  );
}

function HeroBioPreview({ className = '', description, onReadMore }) {
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const canOpenBio = typeof onReadMore === 'function';

  useEffect(() => {
    const checkTruncation = () => {
      const el = textRef.current;
      if (el) {
        setIsTruncated(el.scrollWidth > el.clientWidth);
      }
    };

    checkTruncation();

    if (typeof ResizeObserver !== 'undefined' && textRef.current) {
      const observer = new ResizeObserver(checkTruncation);
      observer.observe(textRef.current);
      return () => observer.disconnect();
    }
  }, [description]);

  if (!description) {
    return null;
  }

  return (
    <div className={`flex w-full min-w-0 items-center text-xs leading-relaxed text-white/70 sm:text-sm ${className}`}>
      <span ref={textRef} className="truncate min-w-0">
        {description}
      </span>
      {isTruncated && canOpenBio ? (
        <Button
          type="button"
          onClick={onReadMore}
          className="shrink-0 ml-2 inline-flex cursor-pointer text-xs font-semibold text-white/80 uppercase transition-colors hover:text-white"
        >
          Read More
        </Button>
      ) : null}
    </div>
  );
}

export default function AccountHero({
  followerCount = 0,
  followingCount = 0,
  onOpenFollowList = null,
  onReadMore = null,
  profile = null,
  username = null,
}) {
  const { openSurface } = useNavigationActions();

  const heroDisplayName =
    String(profile?.displayName || profile?.username || '').trim() || 'Account';
  const profileUsername = username || profile?.username || null;

  const handleFollowListClick = (type) => {
    if (typeof onOpenFollowList === 'function') {
      onOpenFollowList(type);
      return;
    }

    const targetUserId = profile?.id;
    if (!targetUserId) return;

    openSurface(
      createAccountSocialSurfaceEntry({
        canManageRequests: Boolean(profile?.isPrivate),
        userId: targetUserId,
        tab: type,
        profile,
      }),
    );
  };

  const handleBioReadMore = () => {
    if (typeof onReadMore === 'function') {
      onReadMore();
      return;
    }

    openSurface(
      createAccountBioSurfaceEntry({
        description: profile?.description || '',
        followerCount,
        followingCount,
        profile,
        username: profileUsername || 'About',
      }),
    );
  };

  const backdropUrl = useMemo(() => resolveAccountBackdropUrl(profile), [profile]);
  const hasInlineBackdrop = Boolean(backdropUrl);

  const heroAvatarSrc = getUserAvatarUrl(profile);
  const heroAvatarFallbackSrc = getUserAvatarFallbackUrl(profile);
  const joinedAt = formatHeroJoinDate(profile?.createdAt);
  const isPrivateProfile = Boolean(profile?.isPrivate);

  return (
    <>
      {hasInlineBackdrop ? <AccountBackdropHero image={backdropUrl} /> : null}

      <section
        className={`relative z-10 w-full pb-6 ${
          hasInlineBackdrop ? '-mt-20 sm:-mt-28 lg:-mt-36' : 'pt-6 sm:pt-10'
        }`}
      >
        <div className="relative z-10 flex min-w-0 items-start gap-4 sm:gap-6 lg:gap-7">
          <div className="size-20 shrink-0 overflow-hidden rounded-full bg-black/60 shadow-2xl ring-2 ring-white/10 sm:size-28 lg:size-32">
            <AdaptiveImage
              mode="img"
              src={heroAvatarSrc}
              alt={heroDisplayName}
              decoding="async"
              className="h-full w-full object-cover"
              onError={(event) => applyAvatarFallback(event, heroAvatarFallbackSrc)}
              wrapperClassName="h-full w-full"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col pt-1 sm:pt-1.5">
            <h1 className="font-zuume max-w-full text-4xl leading-[0.84] font-bold tracking-tight [overflow-wrap:anywhere] text-white uppercase sm:text-6xl lg:text-7xl">
              {heroDisplayName}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-white/55 sm:mt-3 sm:gap-x-3 sm:text-base">
              <button
                type="button"
                onClick={() => handleFollowListClick('following')}
                className="group inline-flex cursor-pointer items-baseline gap-1.5 text-left transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
              >
                <span className="font-semibold text-white transition-colors group-hover:text-white">
                  {formatHeroCount(followingCount)}
                </span>
                <span>Following</span>
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleFollowListClick('followers')}
                className="group inline-flex cursor-pointer items-baseline gap-1.5 text-left transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
              >
                <span className="font-semibold text-white transition-colors group-hover:text-white">
                  {formatHeroCount(followerCount)}
                </span>
                <span>Followers</span>
              </button>
              <span>•</span>
              <span>Joined {joinedAt}</span>
              <span>•</span>
              <span
                className="inline-flex items-center gap-1.5"
                title={isPrivateProfile ? 'Private profile' : 'Public profile'}
              >
                <Icon
                  icon={isPrivateProfile ? 'solar:lock-keyhole-bold' : 'solar:global-bold'}
                  size={16}
                  aria-hidden="true"
                />
                <span>{isPrivateProfile ? 'Private' : 'Public'}</span>
              </span>
            </div>

            {profile?.description ? (
              <HeroBioPreview
                className="mt-2.5 sm:mt-3"
                description={profile.description}
                onReadMore={handleBioReadMore}
              />
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
