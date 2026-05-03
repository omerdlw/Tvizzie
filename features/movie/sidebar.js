'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

import {
  MOVIE_ROUTE_TIMING,
  MovieSurfaceReveal,
  getMovieDelayedTransition,
  getSurfaceItemMotion,
} from '@/app/(media)/movie/[id]/motion';
import { TMDB_IMG } from '@/core/constants';
import { formatCurrency, getImagePlaceholderDataUrl, resolveImageQuality } from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Tooltip from '@/ui/elements/tooltip';
import Icon from '@/ui/icon';
import { cn } from '@/core/utils';

const MAX_VISIBLE_PERSONS = 2;
const MAX_VISIBLE_TAGS = 8;

function normalizeTaxonomyItems(items = [], prefix = '') {
  return Array.from(
    new Set(
      items
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => `${prefix}${item.replace(/^#/, '')}`)
    )
  );
}

function SidebarRow({ icon, children }) {
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm text-white">
      <span className="mt-0.5 inline-flex shrink-0 text-white/70">
        <Icon icon={icon} size={18} />
      </span>
      <div className="flex-1 leading-relaxed font-medium">{children}</div>
    </div>
  );
}

function SidebarMotionItem({ children, delay = 0, index = 0 }) {
  const itemMotion = getSurfaceItemMotion({
    preset: 'sidebarRow',
    index,
  });

  return (
    <motion.div
      initial={itemMotion.initial}
      animate={itemMotion.animate}
      transition={getMovieDelayedTransition(itemMotion.transition, delay)}
    >
      {children}
    </motion.div>
  );
}

function SidebarMotionChip({ children, delay = 0, index = 0 }) {
  const itemMotion = getSurfaceItemMotion({
    preset: 'sidebarChip',
    index,
  });

  return (
    <motion.span
      className="inline-flex"
      initial={itemMotion.initial}
      animate={itemMotion.animate}
      transition={getMovieDelayedTransition(itemMotion.transition, delay)}
    >
      {children}
    </motion.span>
  );
}

function PersonLink({ person }) {
  return (
    <Link href={`/person/${person.id}`} className="text-white/70 transition-colors">
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
            {index < visible.length - 1 && <span className="text-white/50">,</span>}
          </div>
        ))}

        {hidden.length > 0 && (
          <Tooltip text={hidden.map((person) => person.name).join(', ')} position="top">
            <span className="shrink-0 cursor-help text-xs font-bold text-white/70 transition-colors">
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

function TaxonomyGroup({ delay = 0, items = [], label, variant = 'default' }) {
  if (!items.length) {
    return null;
  }

  const isTagGroup = variant === 'tags';
  const visibleItems = isTagGroup ? items.slice(0, MAX_VISIBLE_TAGS) : items;
  const hiddenItems = isTagGroup ? items.slice(MAX_VISIBLE_TAGS) : [];

  return (
    <div className="flex flex-col gap-2.5">
      <SidebarMotionItem delay={delay} index={0}>
        <p className="text-[11px] leading-none font-semibold tracking-widest text-white/50 uppercase">{label}</p>
      </SidebarMotionItem>
      <div className={cn('flex flex-wrap', isTagGroup ? 'gap-1.5' : 'gap-2')}>
        {visibleItems.map((item, index) => (
          <SidebarMotionChip key={item} delay={delay + MOVIE_ROUTE_TIMING.sidebar.taxonomyStagger} index={index}>
            <span
              className={cn(
                'inline-flex max-w-full items-center rounded bg-white/5 text-[11px] font-semibold',
                isTagGroup
                  ? 'min-h-7 px-2.5 py-1 leading-snug tracking-wide text-white/60'
                  : 'min-h-7 px-2.5 py-1 leading-none tracking-wide text-white/80 uppercase'
              )}
            >
              {item}
            </span>
          </SidebarMotionChip>
        ))}

        {hiddenItems.length > 0 ? (
          <SidebarMotionChip
            key="hidden-tags"
            delay={delay + MOVIE_ROUTE_TIMING.sidebar.taxonomyStagger}
            index={visibleItems.length}
          >
            <Tooltip text={hiddenItems.join(', ')} position="top">
              <span className="inline-flex min-h-7 items-center rounded bg-white/5 px-2.5 py-1 text-[11px] leading-none font-semibold text-white/80">
                +{hiddenItems.length}
              </span>
            </Tooltip>
          </SidebarMotionChip>
        ) : null}
      </div>
    </div>
  );
}

function SidebarTaxonomy({ delay = 0, genres = [], tags = [] }) {
  const normalizedGenres = normalizeTaxonomyItems(genres);
  const normalizedTags = normalizeTaxonomyItems(tags, '#');

  if (!normalizedGenres.length && !normalizedTags.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <TaxonomyGroup delay={delay} label="Genres" items={normalizedGenres} />
      <TaxonomyGroup
        delay={delay + MOVIE_ROUTE_TIMING.sidebar.taxonomyStagger * (normalizedGenres.length + 1)}
        label="Tags"
        items={normalizedTags}
        variant="tags"
      />
    </div>
  );
}

export function MovieSidebarPrimary({ item, topContent }) {
  const posterSrc = item.poster_path ? `${TMDB_IMG}/w780${item.poster_path}` : null;

  return (
    <div
      data-movie-sidebar-primary="true"
      className={cn("movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col gap-2 py-7")}
    >
      <MovieSurfaceReveal animateOnView={false} delay={MOVIE_ROUTE_TIMING.sidebar.posterDelay}>
        <div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden rounded">
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
              className="rounded object-cover"
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="center h-full w-full bg-white/5 text-white/50">
              <Icon icon="solar:clapperboard-play-bold" size={40} />
            </div>
          )}
        </div>
      </MovieSurfaceReveal>

      {topContent || null}
    </div>
  );
}

export function MovieSidebarDetails({ item, director, writers, creators, certification, genres = [], tags = [] }) {
  const episodeRuntime = item.episode_run_time?.[0] || item.last_episode_to_air?.runtime || null;
  const originalLanguageName =
    item.spoken_languages?.find((language) => language.iso_639_1 === item.original_language)?.english_name ||
    item.original_language;
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
          Rated <span className="text-white/70">{certification}</span>
        </>
      ),

    originalLanguageName &&
      createRow(
        'language',
        'solar:globus-bold',
        <>
          Original Language: <span className="text-white/70">{originalLanguageName}</span>
        </>
      ),

    item.status &&
      createRow(
        'status',
        'solar:info-circle-bold',
        <>
          Status: <span className="text-white/70">{item.status}</span>
        </>
      ),

    episodeRuntime &&
      createRow(
        'runtime',
        'solar:clock-circle-bold',
        <>
          ~<span className="text-white/70">{episodeRuntime}</span> min / episode
        </>
      ),

    item.budget > 0 &&
      createRow(
        'budget',
        'solar:dollar-bold',
        <>
          Budget: <span className="text-white/70">{formatCurrency(item.budget)}</span>
        </>
      ),

    item.revenue > 0 &&
      createRow(
        'revenue',
        'solar:graph-up-bold',
        <>
          Revenue: <span className="text-white/70">{formatCurrency(item.revenue)}</span>
        </>
      ),
  ].filter(Boolean);

  return hasTaxonomy || rows.length ? (
    <div className={cn("movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col justify-center gap-5 py-6 lg:flex-1 lg:py-7")}>
      {hasTaxonomy ? (
        <SidebarTaxonomy delay={MOVIE_ROUTE_TIMING.sidebar.taxonomyDelay} genres={genres} tags={tags} />
      ) : null}

      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <SidebarMotionItem key={row.id} delay={MOVIE_ROUTE_TIMING.sidebar.rowsDelay} index={index}>
            <SidebarRow icon={row.icon}>{row.content}</SidebarRow>
          </SidebarMotionItem>
        ))}
      </div>
    </div>
  ) : null;
}

export default function Sidebar(props) {
  return (
    <div className="flex h-full flex-col gap-0">
      <MovieSidebarPrimary item={props.item} topContent={props.topContent} />
      <MovieSidebarDetails
        item={props.item}
        director={props.director}
        writers={props.writers}
        creators={props.creators}
        certification={props.certification}
        genres={props.genres}
        tags={props.tags}
      />
    </div>
  );
}
