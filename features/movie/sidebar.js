'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import { cn, formatCurrency, getImagePlaceholderDataUrl, resolveImageQuality } from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Tooltip from '@/ui/elements/tooltip';
import Icon from '@/ui/icon';
import {
  getMovieFeatureItemMotion,
  MOVIE_FEATURE_SOFT_STAGGER,
  MOVIE_FEATURE_SECTION_MOTION,
} from '@/features/movie/motion';

const MAX_VISIBLE_PERSONS = 2;
const MAX_VISIBLE_TAGS = 8;
const TAXONOMY_STAGGER_PARENT = Object.freeze({
  initial: 'hidden',
  animate: 'visible',
  variants: Object.freeze({
    hidden: {},
    visible: Object.freeze({
      transition: Object.freeze({
        delayChildren: MOVIE_FEATURE_SOFT_STAGGER.delay,
        staggerChildren: MOVIE_FEATURE_SOFT_STAGGER.interval,
      }),
    }),
  }),
});

const TAXONOMY_STAGGER_CHILD = Object.freeze({
  variants: Object.freeze({
    hidden: Object.freeze({
      opacity: 0,
      y: MOVIE_FEATURE_SOFT_STAGGER.initialY,
      scale: MOVIE_FEATURE_SOFT_STAGGER.initialScale,
    }),
    visible: Object.freeze({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: Object.freeze({
        type: 'tween',
        duration: MOVIE_FEATURE_SOFT_STAGGER.duration,
      }),
    }),
  }),
});

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
    <motion.div className="flex items-start gap-2 py-1.5 text-sm text-white" {...getMovieFeatureItemMotion(0)}>
      <span className="mt-0.5 inline-flex shrink-0 text-white/70">
        <Icon icon={icon} size={18} />
      </span>
      <div className="flex-1 leading-relaxed font-medium">{children}</div>
    </motion.div>
  );
}

function PersonLink({ person }) {
  return (
    <Link href={`/person/${person.id}`} className="text-white/70">
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
            <span className="shrink-0 cursor-help text-xs font-bold text-white/70">+{hidden.length}</span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function createRow(id, icon, content) {
  return { id, icon, content };
}

function TaxonomyGroup({ items = [], label, variant = 'default', motionIndex = 0 }) {
  if (!items.length) {
    return null;
  }

  const isTagGroup = variant === 'tags';
  const visibleItems = isTagGroup ? items.slice(0, MAX_VISIBLE_TAGS) : items;
  const hiddenItems = isTagGroup ? items.slice(MAX_VISIBLE_TAGS) : [];

  return (
    <motion.div className="flex flex-col gap-2.5" {...getMovieFeatureItemMotion(motionIndex)}>
      <motion.div {...getMovieFeatureItemMotion(motionIndex + 1)}>
        <p className="text-[11px] leading-none font-semibold tracking-widest text-white/50 uppercase">{label}</p>
      </motion.div>
      <motion.div className={cn('flex flex-wrap', isTagGroup ? 'gap-1.5' : 'gap-2')} {...TAXONOMY_STAGGER_PARENT}>
        {visibleItems.map((item, index) => (
          <motion.span key={item} className="inline-flex" {...TAXONOMY_STAGGER_CHILD}>
            <span
              className={cn(
                'inline-flex max-w-full items-center bg-white/10 text-[11px] font-semibold',
                isTagGroup
                  ? 'min-h-7 px-2.5 py-1 leading-snug tracking-wide text-white/50'
                  : 'min-h-7 px-2.5 py-1 leading-none tracking-wide text-white/70 uppercase'
              )}
            >
              {item}
            </span>
          </motion.span>
        ))}

        {hiddenItems.length > 0 ? (
          <motion.span
            key="hidden-tags"
            className="inline-flex"
            {...TAXONOMY_STAGGER_CHILD}
          >
            <Tooltip text={hiddenItems.join(', ')} position="top">
              <span className="inline-flex min-h-7 items-center bg-white/10 px-2.5 py-1 text-[11px] leading-none font-semibold text-white/70">
                +{hiddenItems.length}
              </span>
            </Tooltip>
          </motion.span>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function SidebarTaxonomy({ genres = [], tags = [] }) {
  const normalizedGenres = normalizeTaxonomyItems(genres);
  const normalizedTags = normalizeTaxonomyItems(tags, '#');

  if (!normalizedGenres.length && !normalizedTags.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <TaxonomyGroup label="Genres" items={normalizedGenres} motionIndex={2} />
      <TaxonomyGroup label="Tags" items={normalizedTags} variant="tags" motionIndex={6} />
    </div>
  );
}

export function MovieSidebarPrimary({ item, topContent }) {
  const posterSrc = item.poster_path ? `${TMDB_IMG}/w780${item.poster_path}` : null;

  return (
    <motion.div data-movie-sidebar-primary="true" className="media-detail-poster-shell flex flex-col gap-2" {...MOVIE_FEATURE_SECTION_MOTION}>
      <motion.div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden" {...getMovieFeatureItemMotion(0)}>
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
          <div className="center h-full w-full bg-white/10 text-white/50">
            <Icon icon="solar:clapperboard-play-bold" size={40} />
          </div>
        )}
      </motion.div>

      {topContent ? <motion.div {...getMovieFeatureItemMotion(1)}>{topContent}</motion.div> : null}
    </motion.div>
  );
}

export function MovieSidebarDetails({ item, director, writers, creators, certification, genres = [], tags = [] }) {
  const episodeRuntime = item.episode_run_time?.[0] || item.last_episode_to_air?.runtime || null;
  const originalLanguageName =
    item.spoken_languages?.find((language) => language.iso_639_1 === item.original_language)?.english_name ||
    item.original_language;
  const hasTaxonomy = genres?.length || tags?.length;

  const personGroups = [
    { id: 'writers', label: 'Written by', icon: 'solar:pen-bold', persons: writers },
    { id: 'creators', label: 'Created by', icon: 'solar:pen-bold', persons: creators },
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
      .map((group) => createRow(group.id, group.icon, <PersonsDisplay persons={group.persons} label={group.label} />)),

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
    <motion.div
      className="movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col justify-center gap-5 py-6 lg:flex-1 lg:py-7"
      {...MOVIE_FEATURE_SECTION_MOTION}
    >
      {hasTaxonomy ? <SidebarTaxonomy genres={genres} tags={tags} /> : null}

      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <motion.div key={row.id} {...getMovieFeatureItemMotion(index + 10)}>
            <SidebarRow icon={row.icon}>{row.content}</SidebarRow>
          </motion.div>
        ))}
      </div>
    </motion.div>
  ) : null;
}

export default function Sidebar(props) {
  return (
    <motion.div className="flex h-full flex-col gap-0" {...MOVIE_FEATURE_SECTION_MOTION}>
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
    </motion.div>
  );
}
