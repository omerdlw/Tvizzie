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
  if (!image) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="relative isolate h-64 w-[calc(100%+2rem)] -translate-x-4 overflow-hidden sm:h-80 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(30rem,45vw,36rem)] lg:w-[calc(100%+4rem)] lg:-translate-x-8 xl:w-[calc(100%+8rem)] xl:-translate-x-16"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundColor: 'var(--black)',
          backgroundImage: `url(${image})`,
          backgroundPosition: 'center 20%',
        }}
      />
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(to bottom, rgb(11 11 11 / 20%) 0%, rgb(11 11 11 / 10%) 18%, transparent 34%), linear-gradient(to right, var(--black) 0%, rgb(11 11 11 / 80%) 6%, rgb(11 11 11 / 50%) 13%, rgb(11 11 11 / 20%) 21%, transparent 30%, transparent 70%, rgb(11 11 11 / 20%) 79%, rgb(11 11 11 / 50%) 87%, rgb(11 11 11 / 80%) 94%, var(--black) 100%), linear-gradient(to bottom, transparent 38%, rgb(11 11 11 / 20%) 62%, rgb(11 11 11 / 50%) 82%, var(--black) 100%)',
        }}
      />
    </div>
  );
}

function HeroInlineMetric({ item }) {
  const innerContent = (
    <>
      <span className="font-zuume text-xl leading-none sm:text-2xl">{item.value}</span>

      <span className="text-xs text-white/40 transition-colors group-hover:text-white/70">
        {item.label}
      </span>
    </>
  );

  const baseClassName =
    'group flex min-w-16 flex-col gap-0.5 text-left transition-colors hover:text-white select-none';

  if (item.href) {
    return (
      <Link href={item.href} className={baseClassName}>
        {innerContent}
      </Link>
    );
  }

  if (typeof item.onClick === 'function') {
    return (
      <Button type="button" onClick={item.onClick} className={baseClassName}>
        {innerContent}
      </Button>
    );
  }

  return <div className={baseClassName}>{innerContent}</div>;
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
    <div className={`relative w-full max-w-2xl text-left ${className}`}>
      <p className="w-full text-sm leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] text-white/70 sm:text-base">
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
        className="pointer-events-none invisible absolute inset-x-0 top-0 w-full text-sm leading-relaxed text-pretty [overflow-wrap:anywhere] [word-break:break-word] text-white/70 sm:text-base"
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
}) {
  const { openSurface } = useNavigationActions();

  const heroDisplayName =
    String(profile?.displayName || profile?.username || '').trim() || 'Account';
  const profileUsername = profile?.username || null;

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

  const socialMetrics = [
    {
      label: 'Followers',
      onClick: () => handleFollowListClick('followers'),
      value: formatHeroCount(followerCount),
    },
    {
      label: 'Following',
      onClick: () => handleFollowListClick('following'),
      value: formatHeroCount(followingCount),
    },
  ];

  const heroAvatarSrc = getUserAvatarUrl(profile);
  const heroAvatarFallbackSrc = getUserAvatarFallbackUrl(profile);

  return (
    <>
      {hasInlineBackdrop ? <AccountBackdropHero image={backdropUrl} /> : null}

      <section
        className={`relative z-10 ${
          hasInlineBackdrop ? '-mt-24 sm:-mt-36 lg:-mt-52' : 'pt-8 sm:pt-12 lg:pt-14'
        }`}
      >
        <div className="relative z-10 grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 sm:flex sm:items-center sm:gap-5">
            <div className="size-20 shrink-0 overflow-hidden rounded-[30px] ring-1 ring-inset ring-white/5 shadow-2xl sm:size-24">
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

            <div className="contents sm:flex sm:min-w-0 sm:flex-1 sm:flex-col sm:justify-center">
              <div className="min-w-0">
                <h1 className="font-zuume max-w-full text-5xl leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-6xl">
                  {heroDisplayName}
                </h1>
              </div>

              {profile?.description ? (
                <HeroBioPreview
                  className="col-span-2 sm:col-auto"
                  description={profile.description}
                  onReadMore={handleBioReadMore}
                />
              ) : null}
            </div>
          </div>

          <div className="flex items-center">
            {socialMetrics.map((item, index) => (
              <div
                key={`social-${item.label}-${index}`}
                className={index === 0 ? 'pr-4 sm:pr-5' : 'border-l border-white/10 pl-4 sm:pl-5'}
              >
                <HeroInlineMetric item={item} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
