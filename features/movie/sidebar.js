'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import { cn, formatCurrency, getImagePlaceholderDataUrl } from '@/core/utils';
import Tooltip from '@/ui/elements/tooltip';
import Icon from '@/ui/icon';

const MAX_VISIBLE_PERSONS = 2;
const COMMUNITY_REVIEWS_SELECTOR = '[data-community-reviews="true"]';
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

function SidebarRow({ icon, children }) {
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm text-black">
      <Icon className="mt-0.5 shrink-0 text-black/70" icon={icon} size={18} />
      <div className="flex-1 leading-relaxed font-medium">{children}</div>
    </div>
  );
}

function PersonLink({ person }) {
  return (
    <Link href={`/person/${person.id}`} className="text-black/70 transition-colors">
      {person.name}
    </Link>
  );
}

function PersonsDisplay({ persons, label }) {
  if (!persons?.length) {
    return null;
  }

  const visible = persons.slice(0, MAX_VISIBLE_PERSONS);
  const hidden = persons.slice(MAX_VISIBLE_PERSONS);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0">{label}</span>

      <div className="flex flex-wrap items-center gap-1">
        {visible.map((person, index) => (
          <div key={person.id} className="flex items-center gap-1">
            <PersonLink person={person} />
            {index < visible.length - 1 && <span className="text-black/60">,</span>}
          </div>
        ))}

        {hidden.length > 0 && (
          <Tooltip text={hidden.map((person) => person.name).join(', ')} position="top">
            <span className="shrink-0 cursor-help text-xs font-bold text-black/70 transition-colors">
              +{hidden.length}
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function createRow(id, icon, content) {
  return { id, icon, content };
}

export default function Sidebar({ item, director, writers, creators, certification, topContent }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isCommunityReviewsVisible, setIsCommunityReviewsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleDesktopChange = () => {
      setIsDesktop(mediaQuery.matches);
    };

    handleDesktopChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleDesktopChange);
    } else {
      mediaQuery.addListener(handleDesktopChange);
    }

    let observer = null;
    let mutationObserver = null;

    const bindObserver = () => {
      if (observer) {
        return true;
      }

      const target = document.querySelector(COMMUNITY_REVIEWS_SELECTOR);

      if (!target) {
        setIsCommunityReviewsVisible(false);
        return false;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          setIsCommunityReviewsVisible(entry.isIntersecting);
        },
        {
          threshold: 0.08,
          rootMargin: '0px 0px -18% 0px',
        }
      );

      observer.observe(target);
      return true;
    };

    if (!bindObserver()) {
      mutationObserver = new MutationObserver(() => {
        if (bindObserver()) {
          mutationObserver?.disconnect();
        }
      });

      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleDesktopChange);
      } else {
        mediaQuery.removeListener(handleDesktopChange);
      }

      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, []);

  const episodeRuntime = item.episode_run_time?.[0] || item.last_episode_to_air?.runtime || null;
  const originalLanguageName =
    item.spoken_languages?.find((language) => language.iso_639_1 === item.original_language)?.english_name ||
    item.original_language;
  const posterSrc = item.poster_path ? `${TMDB_IMG}/w780${item.poster_path}` : null;
  const shouldCollapseDetails = isDesktop && isCommunityReviewsVisible;

  const personGroups = [
    {
      id: 'writers',
      label: 'Written by',
      icon: 'solar:pen-bold',
      persons: writers,
    },
    {
      id: 'creators',
      label: 'Created by',
      icon: 'solar:pen-bold',
      persons: creators,
    },
  ];

  const rows = [
    director &&
      createRow(
        'director',
        'solar:camera-minimalistic-bold',
        <>
          <span className="mr-1">Directed by</span>
          <PersonLink person={director} />
        </>
      ),

    ...personGroups
      .filter((group) => group.persons?.length)
      .map((group) => {
        return createRow(group.id, group.icon, <PersonsDisplay persons={group.persons} label={group.label} />);
      }),

    certification &&
      createRow(
        'certification',
        'solar:shield-bold',
        <>
          Rated <span className="text-black/70">{certification}</span>
        </>
      ),

    originalLanguageName &&
      createRow(
        'language',
        'solar:globus-bold',
        <>
          Original Language: <span className="text-black/70">{originalLanguageName}</span>
        </>
      ),

    item.status &&
      createRow(
        'status',
        'solar:info-circle-bold',
        <>
          Status: <span className="text-black/70">{item.status}</span>
        </>
      ),

    episodeRuntime &&
      createRow(
        'runtime',
        'solar:clock-circle-bold',
        <>
          ~<span className="text-black/70">{episodeRuntime}</span> min / episode
        </>
      ),

    item.budget > 0 &&
      createRow(
        'budget',
        'solar:dollar-bold',
        <>
          Budget: <span className="text-black/70">{formatCurrency(item.budget)}</span>
        </>
      ),

    item.revenue > 0 &&
      createRow(
        'revenue',
        'solar:graph-up-bold',
        <>
          Revenue: <span className="text-black/70">{formatCurrency(item.revenue)}</span>
        </>
      ),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-2/3 w-full max-w-none shrink-0 overflow-hidden lg:h-[600px] lg:w-[400px]">
        {posterSrc ? (
          <Image
            fill
            priority
            src={posterSrc}
            alt={item.title || item.name}
            sizes="(max-width: 1024px) 100vw, 400px"
            quality={88}
            placeholder="blur"
            blurDataURL={getImagePlaceholderDataUrl(`${item.id || item.title || item.name}-${item.poster_path}`)}
            className="object-cover"
          />
        ) : (
          <div className="bg-primary center h-full w-full border border-black/5 text-black/60">
            <Icon icon="solar:clapperboard-play-bold" size={40} />
          </div>
        )}
      </div>

      {topContent}

      <div
        className={cn(
          'flex flex-col gap-1 transition-all duration-300 ease-out',
          shouldCollapseDetails
            ? 'pointer-events-none max-h-0 -translate-y-1 overflow-hidden opacity-0'
            : 'max-h-[32rem] translate-y-0 opacity-100'
        )}
        aria-hidden={shouldCollapseDetails}
      >
        {rows.map((row) => (
          <SidebarRow key={row.id} icon={row.icon}>
            {row.content}
          </SidebarRow>
        ))}
      </div>
    </div>
  );
}
