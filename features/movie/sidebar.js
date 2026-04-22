'use client';

import Link from 'next/link';

import { MovieSurfaceReveal } from '@/app/(media)/movie/[id]/motion';
import { TMDB_IMG } from '@/core/constants';
import { formatCurrency, getImagePlaceholderDataUrl, resolveImageQuality } from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Tooltip from '@/ui/elements/tooltip';
import Icon from '@/ui/icon';

const MAX_VISIBLE_PERSONS = 2;

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
            {index < visible.length - 1 && <span className="text-black/50">,</span>}
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
  const episodeRuntime = item.episode_run_time?.[0] || item.last_episode_to_air?.runtime || null;
  const originalLanguageName =
    item.spoken_languages?.find((language) => language.iso_639_1 === item.original_language)?.english_name ||
    item.original_language;
  const posterSrc = item.poster_path ? `${TMDB_IMG}/w780${item.poster_path}` : null;

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
      <MovieSurfaceReveal animateOnView={false} delay={0.04}>
        <div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden rounded-[20px]">
          {posterSrc ? (
            <AdaptiveImage
              fill
              priority
              src={posterSrc}
              alt={item.title || item.name}
              fetchPriority="high"
              sizes="(max-width: 1024px) 100vw, 400px"
              quality={resolveImageQuality('hero')}
              decoding="async"
              placeholder="blur"
              blurDataURL={getImagePlaceholderDataUrl(`${item.id || item.title || item.name}-${item.poster_path}`)}
              className="object-cover"
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="bg-primary center h-full w-full border border-black/5 text-black/50">
              <Icon icon="solar:clapperboard-play-bold" size={40} />
            </div>
          )}
        </div>
      </MovieSurfaceReveal>

      {topContent ? <MovieSurfaceReveal animateOnView={false} delay={0.12}>{topContent}</MovieSurfaceReveal> : null}

      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <SidebarRow key={row.id} icon={row.icon}>
            {row.content}
          </SidebarRow>
        ))}
      </div>
    </div>
  );
}
