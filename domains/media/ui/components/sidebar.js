'use client';

import Link from 'next/link';

import { TMDB_IMG } from '@/shared/constants';
import { formatCurrency, getImagePlaceholderDataUrl, resolveImageQuality } from '@/shared/utils';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Tooltip from '@/ui/primitives/tooltip';
import Icon from '@/ui/primitives/icon';

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
    <div className="flex items-start gap-2.5 py-1.5 text-xs text-white sm:text-sm">
      <span className="inline-flex shrink-0 items-center justify-center pt-0.5 text-white/70">
        <Icon icon={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1 leading-snug font-medium">{children}</div>
    </div>
  );
}

function PersonLink({ person }) {
  return (
    <Link href={`/person/${person.id}`} className="text-white/70 hover:text-white">
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
    <div className="flex min-w-0 items-start gap-1.5">
      <span className="shrink-0">{label}</span>
      <div className="flex flex-wrap items-start gap-1">
        {visible.map((person, index) => (
          <div key={person.id} className="flex items-start gap-1">
            <PersonLink person={person} />
            {index < visible.length - 1 && <span className="text-white/50">,</span>}
          </div>
        ))}

        {hidden.length > 0 && (
          <Tooltip text={hidden.map((person) => person.name).join(', ')} position="top">
            <span className="shrink-0 cursor-help text-xs font-bold text-white/70">
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
    <div className="mt-2 flex flex-col gap-2">
      <div>
        <p className="text-[11px] leading-none font-semibold tracking-widest text-white/70 uppercase">
          GENRES / TAGS
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {normalizedGenres.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {normalizedGenres.map((genre) => {
              return (
                <span
                  key={genre}
                  className="inline-flex min-h-[28px] max-w-full cursor-default items-center border border-white/5 bg-white/5 px-2.5 py-1 text-xs font-semibold tracking-wider text-white/80 uppercase hover:border-white/10 hover:text-white"
                >
                  {genre}
                </span>
              );
            })}
          </div>
        )}
        {normalizedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {normalizedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex min-h-[28px] max-w-full cursor-default items-center border border-white/5 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 uppercase hover:border-white/10 hover:text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
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
  const posterSrc = item.poster_path ? `${TMDB_IMG}/original${item.poster_path}` : null;
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
          Rated <span className="text-white/70">{certification}</span>
        </>,
      ),
    originalLanguageName &&
      createRow(
        'language',
        'solar:globus-bold',
        <>
          Original Language: <span className="text-white/70">{originalLanguageName}</span>
        </>,
      ),
    item.status &&
      createRow(
        'status',
        'solar:info-circle-bold',
        <>
          Status: <span className="text-white/70">{item.status}</span>
        </>,
      ),
    episodeRuntime &&
      createRow(
        'runtime',
        'solar:clock-circle-bold',
        <>
          ~<span className="text-white/70">{episodeRuntime}</span> min / episode
        </>,
      ),
    item.budget > 0 &&
      createRow(
        'budget',
        'solar:dollar-bold',
        <>
          Budget: <span className="text-white/70">{formatCurrency(item.budget)}</span>
        </>,
      ),
    item.revenue > 0 &&
      createRow(
        'revenue',
        'solar:graph-up-bold',
        <>
          Revenue: <span className="text-white/70">{formatCurrency(item.revenue)}</span>
        </>,
      ),
  ].filter(Boolean);

  const taxonomyData = SidebarTaxonomy({
    genres,
    tags,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto aspect-2/3 w-full max-w-[320px] shrink-0 overflow-hidden sm:max-w-[360px] lg:max-w-none">
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
            className="object-cover"
            wrapperClassName="h-full w-full"
          />
        ) : (
          <div className="bg-primary center h-full w-full border border-white/5 text-white/50">
            <Icon icon="solar:clapperboard-play-bold" size={40} />
          </div>
        )}
      </div>

      {topContent ? topContent : null}

      {hasTaxonomy ? taxonomyData.element : null}

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
