'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { TMDB_IMG } from '@/shared/constants';
import { formatCurrency, getImagePlaceholderDataUrl, resolveImageQuality } from '@/shared/utils';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Tooltip from '@/ui/primitives/tooltip';
import Icon from '@/ui/primitives/icon';
import {
  getSidebarRowProps,
  getTaxonomyChipProps,
  getTaxonomyHeaderProps,
  TIMELINES,
  sidebarPosterVariants,
} from '@/app/(media)/motion';

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
      className="text-black/70 transition-colors hover:text-black"
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

function SidebarTaxonomy({ genres = [], baseDelay = TIMELINES.TAXONOMY_BASE_DELAY }) {
  const normalizedGenres = normalizeTaxonomyItems(genres);
  if (!normalizedGenres.length) {
    return { element: null, count: 0 };
  }
  let chipIndexCounter = 0;
  const elements = (
    <div className="mt-2 flex flex-col gap-2">
      <motion.div {...getTaxonomyHeaderProps(baseDelay)}>
        <p className="text-[11px] leading-none font-semibold tracking-widest text-black/70 uppercase">
          GENRES
        </p>
      </motion.div>
      <div className="flex flex-wrap items-center gap-1.5">
        {normalizedGenres.map((genre) => {
          const currentIndex = chipIndexCounter++;
          return (
            <motion.div
              key={genre}
              {...getTaxonomyChipProps(currentIndex, baseDelay)}
              className="inline-flex"
            >
              <span className="bg-primary/80 inline-flex min-h-[28px] max-w-full items-center rounded-[10px] border border-black/10 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-black/80 uppercase shadow-xs transition-colors hover:border-black/20 hover:text-black">
                {genre}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
  return { element: elements, count: chipIndexCounter + 1 };
}

export default function Sidebar({
  item,
  director,
  writers,
  creators,
  certification,
  topContent,
  genres = [],
}) {
  const episodeRuntime = item.episode_run_time?.[0] || item.last_episode_to_air?.runtime || null;
  const originalLanguageName =
    item.spoken_languages?.find((language) => language.iso_639_1 === item.original_language)
      ?.english_name || item.original_language;
  const posterSrc = item.poster_path ? `${TMDB_IMG}/w780${item.poster_path}` : null;
  const hasTaxonomy = genres?.length;
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
    baseDelay: TIMELINES.TAXONOMY_BASE_DELAY,
  });
  const rowBaseDelay =
    TIMELINES.SIDEBAR_ROWS_DELAY + (hasTaxonomy ? taxonomyData.count * TIMELINES.TAXONOMY_STEP : 0);

  return (
    <div className="flex flex-col gap-4">
      <motion.div {...sidebarPosterVariants}>
        <div className="relative mx-auto aspect-2/3 w-full max-w-[320px] shrink-0 overflow-hidden rounded-[24px] sm:max-w-[360px] lg:max-w-none">
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
              className="rounded-[24px] object-cover"
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="bg-primary center h-full w-full border border-black/5 text-black/50">
              <Icon icon="solar:clapperboard-play-bold" size={40} />
            </div>
          )}
        </div>
      </motion.div>

      {topContent ? <div>{topContent}</div> : null}

      {hasTaxonomy ? taxonomyData.element : null}

      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <motion.div key={row.id} {...getSidebarRowProps(index, rowBaseDelay)}>
            <SidebarRow icon={row.icon}>{row.content}</SidebarRow>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
