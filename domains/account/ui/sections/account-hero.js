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

function formatHeroCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
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
  return <BackdropHero image={image} position="center 25%" />;
}

function HeroBioPreview({ className = '', description, onReadMore }) {
  const measureRef = useRef(null);
  const measureTextRef = useRef(null);
  const [preview, setPreview] = useState({ text: description, isTruncated: false });
  const canOpenBio = typeof onReadMore === 'function';

  useEffect(() => {
    const measureElement = measureRef.current;
    const measureTextElement = measureTextRef.current;
    if (!measureElement || !measureTextElement || !description) {
      return;
    }

    const updatePreview = () => {
      const computedStyle = window.getComputedStyle(measureElement);
      const lineHeight = Number.parseFloat(computedStyle.lineHeight);
      const maxHeight = lineHeight * 2;
      const normalizedDescription = description.replace(/\s+/g, ' ').trim();

      const fitsInTwoLines = (text, includeReadMore = false) => {
        measureTextElement.textContent = text;
        const readMoreElement = measureElement.lastElementChild;
        if (readMoreElement) {
          readMoreElement.hidden = !includeReadMore;
        }
        return measureElement.scrollHeight <= maxHeight + 1;
      };

      if (!normalizedDescription || fitsInTwoLines(normalizedDescription)) {
        setPreview((current) =>
          current.text === normalizedDescription && !current.isTruncated
            ? current
            : { text: normalizedDescription, isTruncated: false },
        );
        return;
      }

      const characters = Array.from(normalizedDescription);
      let lowerBound = 0;
      let upperBound = characters.length;

      while (lowerBound < upperBound) {
        const midpoint = Math.ceil((lowerBound + upperBound) / 2);
        const candidate = `${characters.slice(0, midpoint).join('').trimEnd()}… `;

        if (fitsInTwoLines(candidate, true)) {
          lowerBound = midpoint;
        } else {
          upperBound = midpoint - 1;
        }
      }

      const text = characters.slice(0, lowerBound).join('').trimEnd();
      setPreview((current) =>
        current.text === text && current.isTruncated ? current : { text, isTruncated: true },
      );
    };

    updatePreview();

    if (document.fonts?.ready) {
      document.fonts.ready.then(updatePreview).catch(() => {});
    }

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver(updatePreview);
    observer.observe(measureElement);
    return () => observer.disconnect();
  }, [description]);

  if (!description) {
    return null;
  }

  return (
    <div className={`relative w-full max-w-xl text-left ${className}`}>
      <p className="w-full text-xs leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] text-white/70 sm:text-sm">
        {preview.text}
        {preview.isTruncated ? '… ' : null}
        {preview.isTruncated && canOpenBio ? (
          <Button
            type="button"
            onClick={onReadMore}
            className="inline-flex cursor-pointer text-xs font-semibold text-white/70 uppercase transition-colors hover:text-white"
          >
            Read More
          </Button>
        ) : null}
      </p>

      <p
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-0 top-0 w-full text-xs leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] text-white/70 sm:text-sm"
      >
        <span ref={measureTextRef} />
        <span className="text-xs font-semibold uppercase">Read More</span>
      </p>
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

  return (
    <>
      {hasInlineBackdrop ? <AccountBackdropHero image={backdropUrl} /> : null}

      <section
        className={`relative z-10 ${
          hasInlineBackdrop ? '-mt-20 sm:-mt-28 lg:-mt-36' : 'pt-6 sm:pt-10'
        }`}
      >
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div className="size-20 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 shadow-2xl sm:size-24 lg:size-28 bg-black/60">
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

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <h1 className="font-zuume max-w-full text-3xl leading-tight font-bold [overflow-wrap:anywhere] uppercase sm:text-4xl lg:text-5xl text-white">
                {heroDisplayName}
              </h1>

              {profileUsername ? (
                <p className="text-xs sm:text-sm font-mono text-white/50">@{profileUsername}</p>
              ) : null}

              {profile?.description ? (
                <HeroBioPreview
                  className="mt-0.5"
                  description={profile.description}
                  onReadMore={handleBioReadMore}
                />
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-5 rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 px-3.5 py-2 backdrop-blur-sm self-start sm:self-end">
            <button
              type="button"
              onClick={() => handleFollowListClick('following')}
              className="group flex items-baseline gap-1.5 text-left transition-colors cursor-pointer"
            >
              <span className="font-zuume text-xl sm:text-2xl font-bold text-white transition-colors group-hover:text-white">
                {formatHeroCount(followingCount)}
              </span>
              <span className="text-xs font-semibold uppercase text-white/50 transition-colors group-hover:text-white">
                Following
              </span>
            </button>

            <div className="h-3.5 w-px bg-white/10" />

            <button
              type="button"
              onClick={() => handleFollowListClick('followers')}
              className="group flex items-baseline gap-1.5 text-left transition-colors cursor-pointer"
            >
              <span className="font-zuume text-xl sm:text-2xl font-bold text-white transition-colors group-hover:text-white">
                {formatHeroCount(followerCount)}
              </span>
              <span className="text-xs font-semibold uppercase text-white/50 transition-colors group-hover:text-white">
                Followers
              </span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
