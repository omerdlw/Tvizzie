'use client';

import Link from 'next/link';
import { MOVIE_ROUTE_TIMING, MovieSurfaceReveal } from '@/features/media/static-route-elements';
import { TMDB_IMG } from '@/core/constants';
import { formatCurrency, getImagePlaceholderDataUrl, resolveImageQuality } from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Tooltip from '@/ui/elements/tooltip';
import Icon from '@/ui/icon';
import { cn } from '@/core/utils';

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
    <div className="flex items-center gap-2.5 py-1 text-xs text-black sm:text-sm">
      <span className="inline-flex shrink-0 text-black/70">
        <Icon icon={icon} size={18} />
      </span>
      <div className="flex-1 leading-normal font-medium">{children}</div>
    </div>
  );
}

function SidebarItem({ children, delay = 0, index = 0 }) {
  return <div>{children}</div>;
}

function SidebarChip({ children, delay = 0, index = 0 }) {
  return <span className="inline-flex">{children}</span>;
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

function TaxonomyGroup({ delay = 0, items = [], label, variant = 'default' }) {
  if (!items.length) {
    return null;
  }
  const isTagGroup = variant === 'tags';

  return (
    <div className="flex flex-col gap-1.5">
      <SidebarItem delay={delay} index={0}>
        <p className="text-[11px] leading-none font-semibold tracking-widest text-black/50 uppercase">
          {label}
        </p>
      </SidebarItem>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <SidebarChip
            key={item}
            delay={delay + MOVIE_ROUTE_TIMING.sidebar.taxonomyStagger}
            index={index}
          >
            <span
              className={cn(
                'bg-primary inline-flex max-w-full items-center border border-black/5 text-[11px] font-semibold uppercase',
                isTagGroup
                  ? 'rounded-[8px] px-2 py-0.5 font-medium tracking-wide text-black/65 transition-colors hover:border-black/15 hover:text-black'
                  : 'min-h-7 rounded-[10px] px-2.5 py-1 tracking-wider text-black/75',
              )}
            >
              {item}
            </span>
          </SidebarChip>
        ))}
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
  return (
    <div className="flex flex-col gap-4">
      <MovieSurfaceReveal animateOnView={false} delay={MOVIE_ROUTE_TIMING.sidebar.posterDelay}>
        <div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden">
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
      </MovieSurfaceReveal>

      {topContent ? (
        <MovieSurfaceReveal animateOnView={false} delay={MOVIE_ROUTE_TIMING.sidebar.actionsDelay}>
          {topContent}
        </MovieSurfaceReveal>
      ) : null}

      {hasTaxonomy ? (
        <SidebarTaxonomy
          delay={MOVIE_ROUTE_TIMING.sidebar.taxonomyDelay}
          genres={genres}
          tags={tags}
        />
      ) : null}

      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <SidebarItem key={row.id} delay={MOVIE_ROUTE_TIMING.sidebar.rowsDelay} index={index}>
            <SidebarRow icon={row.icon}>{row.content}</SidebarRow>
          </SidebarItem>
        ))}
      </div>
    </div>
  );
}
