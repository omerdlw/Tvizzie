'use client';

import Link from 'next/link';

import { TMDB_IMG } from '@/shared/constants';
import { formatCurrency, getImagePlaceholderDataUrl, resolveImageQuality } from '@/shared/utils';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Tooltip from '@/ui/primitives/tooltip';
import Icon from '@/ui/primitives/icon';
import { MediaRouteReveal } from '@/app/(media)/motion';

const MAX_VISIBLE_PERSONS = 2;

function normalizeTaxonomyItems(items = [], prefix = '') {
  return Array.from(
    new Set(
      items
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => `${prefix}${item.replace(/^#/, '')}`),
    ),
  );
}

function SidebarRow({ icon, children }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-xs text-black sm:text-sm">
      <span className="inline-flex shrink-0 items-center justify-center text-black/70">
        <Icon icon={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1 leading-snug font-medium">{children}</div>
    </div>
  );
}

function PersonLink({ person }) {
  return (
    <Link
      href={`/person/${person.id}`}
      className="text-black/70 hover:text-black"
    >
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
            <span className="shrink-0 cursor-help text-xs font-bold text-black/70">
              +{hidden.length}
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function createRow(id, icon, content) {
  return {
    id,
    icon,
    content,
  };
}

function SidebarTaxonomy({ genres = [], tags = [] }) {
  const normalizedGenres = normalizeTaxonomyItems(genres);
  const normalizedTags = normalizeTaxonomyItems(tags, '#');
  if (!normalizedGenres.length && !normalizedTags.length) {
    return { element: null, count: 0 };
  }
  const elements = (
    <MediaRouteReveal stage="sidebar.taxonomy">
      <div className="mt-2 flex flex-col gap-2">
      <div>
        <p className="text-[11px] leading-none font-semibold tracking-widest text-black/70 uppercase">
          GENRES / TAGS
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {normalizedGenres.map((genre, index) => {
          return (
            <MediaRouteReveal
              key={genre}
              className="inline-flex"
              stage="sidebar.taxonomy"
              interaction="control"
              interactive
              itemIndex={index}
            >
              <span className="bg-primary/80 inline-flex min-h-[28px] max-w-full items-center rounded-[10px] border border-black/10 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-black/80 uppercase hover:border-black/20 hover:text-black">
                {genre}
              </span>
            </MediaRouteReveal>
          );
        })}
        {normalizedTags.map((tag, index) => (
          <MediaRouteReveal
            key={tag}
            className="inline-flex"
            stage="sidebar.taxonomy"
            interaction="control"
            interactive
            itemIndex={normalizedGenres.length + index}
          >
            <span className="bg-primary/40 inline-flex min-h-[28px] max-w-full items-center rounded-[10px] border border-black/10 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-black/70 uppercase hover:border-black/20 hover:text-black">
              {tag}
            </span>
          </MediaRouteReveal>
        ))}
      </div>
      </div>
    </MediaRouteReveal>
  );
  return { element: elements, count: normalizedGenres.length + normalizedTags.length };
}

export default function Sidebar({
  item,
  director,
  writers,
  creators,
  certification,
  topContent,
  genres = [],
  tags = [],
}) {
  const episodeRuntime = item.episode_run_time?.[0] || item.last_episode_to_air?.runtime || null;
  const originalLanguageName =
    item.spoken_languages?.find((language) => language.iso_639_1 === item.original_language)
      ?.english_name || item.original_language;
  const posterSrc = item.poster_path ? `${TMDB_IMG}/w780${item.poster_path}` : null;
  const hasTaxonomy = genres?.length || tags?.length;
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
        </>,
      ),
    ...personGroups
      .filter((group) => group.persons?.length)
      .map((group) => {
        return createRow(
          group.id,
          group.icon,
          <PersonsDisplay persons={group.persons} label={group.label} />,
        );
      }),
    certification &&
      createRow(
        'certification',
        'solar:shield-bold',
        <>
          Rated <span className="text-black/70">{certification}</span>
        </>,
      ),
    originalLanguageName &&
      createRow(
        'language',
        'solar:globus-bold',
        <>
          Original Language: <span className="text-black/70">{originalLanguageName}</span>
        </>,
      ),
    item.status &&
      createRow(
        'status',
        'solar:info-circle-bold',
        <>
          Status: <span className="text-black/70">{item.status}</span>
        </>,
      ),
    episodeRuntime &&
      createRow(
        'runtime',
        'solar:clock-circle-bold',
        <>
          ~<span className="text-black/70">{episodeRuntime}</span> min / episode
        </>,
      ),
    item.budget > 0 &&
      createRow(
        'budget',
        'solar:dollar-bold',
        <>
          Budget: <span className="text-black/70">{formatCurrency(item.budget)}</span>
        </>,
      ),
    item.revenue > 0 &&
      createRow(
        'revenue',
        'solar:graph-up-bold',
        <>
          Revenue: <span className="text-black/70">{formatCurrency(item.revenue)}</span>
        </>,
      ),
  ].filter(Boolean);

  const taxonomyData = SidebarTaxonomy({
    genres,
    tags,
  });

  return (
    <div className="flex flex-col gap-4">
      <MediaRouteReveal stage="sidebar.poster">
        <div className="relative mx-auto aspect-2/3 w-full max-w-[320px] shrink-0 overflow-hidden rounded-3xl sm:max-w-[360px] lg:max-w-none">
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
              blurDataURL={getImagePlaceholderDataUrl(
                `${item.id || item.title || item.name}-${item.poster_path}`,
              )}
              className="rounded-3xl object-cover"
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="bg-primary center h-full w-full border border-black/5 text-black/50">
              <Icon icon="solar:clapperboard-play-bold" size={40} />
            </div>
          )}
        </div>
      </MediaRouteReveal>

      {topContent ? (
        <MediaRouteReveal stage="sidebar.actions">{topContent}</MediaRouteReveal>
      ) : null}

      {hasTaxonomy ? taxonomyData.element : null}

      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <MediaRouteReveal key={row.id} stage="sidebar.rows" itemIndex={index}>
            <SidebarRow icon={row.icon}>{row.content}</SidebarRow>
          </MediaRouteReveal>
        ))}
      </div>
    </div>
  );
}
