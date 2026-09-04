'use client';

import { Fragment, use } from 'react';
import Icon from '@/ui/primitives/icon';
import { useDraggableScroll } from '@/shared';
import { cn } from '@/ui/class-names';

export const RATING_LEGEND = [
  { label: 'Absolute Cinema', className: 'bg-[#259be8] text-black', dotClass: 'bg-[#259be8]' },
  { label: 'Awesome', className: 'bg-[#17713c] text-white', dotClass: 'bg-[#17713c]' },
  { label: 'Great', className: 'bg-[#2ab665] text-white', dotClass: 'bg-[#2ab665]' },
  { label: 'Good', className: 'bg-[#f8d33b] text-black', dotClass: 'bg-[#f8d33b]' },
  { label: 'Average', className: 'bg-[#f89b13] text-white', dotClass: 'bg-[#f89b13]' },
  { label: 'Bad', className: 'bg-[#ed4b3d] text-white', dotClass: 'bg-[#ed4b3d]' },
  { label: 'Garbage', className: 'bg-[#683c77] text-white', dotClass: 'bg-[#683c77]' },
];

function getRatingTone(rating) {
  if (rating >= 9.7) return RATING_LEGEND[0];
  if (rating >= 9) return RATING_LEGEND[1];
  if (rating >= 8) return RATING_LEGEND[2];
  if (rating >= 7) return RATING_LEGEND[3];
  if (rating >= 6) return RATING_LEGEND[4];
  if (rating >= 5) return RATING_LEGEND[5];
  return RATING_LEGEND[6];
}

function formatRating(rating) {
  return Number(rating).toFixed(1);
}

function getEpisodeMap(seasons) {
  return new Map(
    seasons.map((season) => [
      season.seasonNumber,
      new Map(season.episodes.map((episode) => [episode.episodeNumber, episode])),
    ]),
  );
}

export function RatingsLegend({ className }) {
  return (
    <div className={cn('flex flex-col gap-2.5 pt-2', className)}>
      <p className="text-xs font-semibold text-white/50 uppercase">Rating Scale</p>
      <div className="flex flex-col gap-2">
        {RATING_LEGEND.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2.5 text-xs font-semibold text-white/70 uppercase"
          >
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-full ${item.dotClass}`}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TvSeasonRatingsEmpty() {
  return (
    <section className="flex min-h-64 w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="center size-11 rounded-[14px] bg-black/60 text-white/50 ring-1 ring-white/10 ring-inset">
        <Icon icon="solar:chart-2-bold" size={20} />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-white">Ratings unavailable</h2>
        <p className="mt-1 max-w-sm text-sm leading-6 text-white/50">
          Episode ratings are not available for this series yet.
        </p>
      </div>
    </section>
  );
}

function resolveGridScale(seasonsCount) {
  if (seasonsCount <= 4) {
    return {
      cellClass: 'size-16 sm:size-[4.5rem] rounded-[14px] text-base sm:text-lg font-bold',
      emptyCellClass: 'size-16 sm:size-[4.5rem] rounded-[14px]',
      colWidth: '4.5rem',
      rowHeaderWidth: '2.5rem',
      gapClass: 'gap-2.5 sm:gap-3',
      seasonHeaderClass: 'center h-8 sm:h-9 text-xs sm:text-sm font-bold text-white/50 uppercase',
      episodeLabelClass:
        'center size-10 sm:size-12 self-center text-xs sm:text-sm font-bold text-white/50 uppercase tabular-nums',
    };
  }

  if (seasonsCount <= 8) {
    return {
      cellClass: 'size-13 sm:size-14 rounded-[12px] text-sm sm:text-base font-bold',
      emptyCellClass: 'size-13 sm:size-14 rounded-[12px]',
      colWidth: '3.75rem',
      rowHeaderWidth: '2.25rem',
      gapClass: 'gap-2 sm:gap-2.5',
      seasonHeaderClass: 'center h-8 text-xs font-bold text-white/50 uppercase',
      episodeLabelClass:
        'center size-9 sm:size-10 self-center text-xs font-bold text-white/50 uppercase tabular-nums',
    };
  }

  if (seasonsCount <= 12) {
    return {
      cellClass: 'size-11 sm:size-12 rounded-[10px] text-xs sm:text-sm font-bold',
      emptyCellClass: 'size-11 sm:size-12 rounded-[10px]',
      colWidth: '3rem',
      rowHeaderWidth: '2rem',
      gapClass: 'gap-1.5 sm:gap-2',
      seasonHeaderClass: 'center h-7 text-xs font-bold text-white/50 uppercase',
      episodeLabelClass:
        'center size-8 self-center text-xs font-bold text-white/50 uppercase tabular-nums',
    };
  }

  return {
    cellClass: 'size-9 sm:size-10 rounded-[8px] text-xs font-bold',
    emptyCellClass: 'size-9 sm:size-10 rounded-[8px]',
    colWidth: '2.5rem',
    rowHeaderWidth: '2rem',
    gapClass: 'gap-1.5',
    seasonHeaderClass: 'center h-7 text-xs font-bold text-white/50 uppercase',
    episodeLabelClass:
      'center size-8 self-center text-xs font-bold text-white/50 uppercase tabular-nums',
  };
}

export default function TvSeasonRatings({ ratingsPromise }) {
  const seasons = use(ratingsPromise);
  const scrollRef = useDraggableScroll();

  if (!Array.isArray(seasons) || !seasons.length) {
    return <TvSeasonRatingsEmpty />;
  }

  const scale = resolveGridScale(seasons.length);
  const episodeMap = getEpisodeMap(seasons);
  const maxEpisodeNumber = Math.max(
    0,
    ...seasons.map((season) =>
      Math.max(
        Number(season.expectedEpisodeCount) || 0,
        ...season.episodes.map((episode) => episode.episodeNumber),
      ),
    ),
  );
  const episodeNumbers = Array.from({ length: maxEpisodeNumber }, (_, index) => index + 1);

  return (
    <section className="relative flex w-full flex-col">
      <div
        ref={scrollRef}
        className="hide-scrollbar cursor-grab overflow-x-auto pt-1 pb-4 select-none active:cursor-grabbing"
      >
        <div
          className={cn('grid w-max', scale.gapClass)}
          style={{
            gridTemplateColumns: `${scale.rowHeaderWidth} repeat(${seasons.length}, ${scale.colWidth})`,
          }}
        >
          <div aria-hidden="true" />
          {seasons.map((season) => (
            <div key={season.seasonNumber} className={scale.seasonHeaderClass}>
              S{season.seasonNumber}
            </div>
          ))}

          {episodeNumbers.map((episodeNumber) => (
            <Fragment key={`episode-${episodeNumber}`}>
              <div className={scale.episodeLabelClass}>E{episodeNumber}</div>
              {seasons.map((season) => {
                const episode = episodeMap.get(season.seasonNumber)?.get(episodeNumber);

                if (!episode) {
                  return (
                    <div
                      key={`${season.seasonNumber}-${episodeNumber}`}
                      aria-hidden="true"
                      className={cn(
                        'bg-white/5 ring-1 ring-white/5 ring-inset',
                        scale.emptyCellClass,
                      )}
                    />
                  );
                }

                const tone = getRatingTone(episode.rating);
                const label = [
                  `Season ${season.seasonNumber}, episode ${episode.episodeNumber}`,
                  episode.title,
                  `${episode.source === 'tmdb' ? 'TMDB fallback' : 'IMDb'} rating ${formatRating(episode.rating)}`,
                  episode.votes ? `${episode.votes.toLocaleString()} votes` : null,
                ]
                  .filter(Boolean)
                  .join('. ');

                return (
                  <div
                    key={`${season.seasonNumber}-${episodeNumber}`}
                    aria-label={label}
                    title={label}
                    className={cn(
                      'center tabular-nums transition-transform duration-150 hover:z-10 hover:scale-110',
                      scale.cellClass,
                      tone.className,
                    )}
                  >
                    {formatRating(episode.rating)}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
