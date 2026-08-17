'use client';

import { Fragment, use } from 'react';

import Icon from '@/ui/primitives/icon';
import { GridCrosshair } from '@/domains/shell/layout/grid-crosshair';

const RATING_LEGEND = [
  { label: 'Absolute Cinema', className: 'bg-[#259be8] text-black' },
  { label: 'Awesome', className: 'bg-[#17713c] text-black' },
  { label: 'Great', className: 'bg-[#2ab665] text-white' },
  { label: 'Good', className: 'bg-[#f8d33b] text-white' },
  { label: 'Average', className: 'bg-[#f89b13] text-white' },
  { label: 'Bad', className: 'bg-[#ed4b3d] text-black' },
  { label: 'Garbage', className: 'bg-[#683c77] text-black' },
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

function RatingsLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold tracking-wide text-white/70 uppercase sm:gap-x-6">
      {RATING_LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2 whitespace-nowrap">
          <span aria-hidden="true" className={`size-2.5 ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function TvSeasonRatingsEmpty() {
  return (
    <section className="flex min-h-64 w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="center size-11 border border-white/10 bg-black/40 text-white/50">
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

export default function TvSeasonRatings({ ratingsPromise }) {
  const seasons = use(ratingsPromise);

  if (!Array.isArray(seasons) || !seasons.length) {
    return <TvSeasonRatingsEmpty />;
  }

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
    <section className="relative w-full">
      <div className="relative flex min-h-14 flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <RatingsLegend />
        <div className="pointer-events-none absolute right-px bottom-0 left-px h-px bg-white/10 backdrop-blur-sm">
          <GridCrosshair side="left" />
          <GridCrosshair side="right" />
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-5">
        <div
          className="grid w-max gap-2 lg:mx-auto"
          style={{ gridTemplateColumns: `2rem repeat(${seasons.length}, 3.5rem)` }}
        >
          <div aria-hidden="true" />
          {seasons.map((season) => (
            <div
              key={season.seasonNumber}
              className="center size-14 text-xs font-semibold tracking-wide text-white/50 uppercase"
            >
              S{season.seasonNumber}
            </div>
          ))}

          {episodeNumbers.map((episodeNumber) => (
            <Fragment key={`episode-${episodeNumber}`}>
              <div className="center size-8 self-center text-[10px] font-semibold tracking-wide text-white/50 uppercase">
                E{episodeNumber}
              </div>
              {seasons.map((season) => {
                const episode = episodeMap.get(season.seasonNumber)?.get(episodeNumber);

                if (!episode) {
                  return (
                    <div
                      key={`${season.seasonNumber}-${episodeNumber}`}
                      aria-hidden="true"
                      className="size-14"
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
                    className={`center size-14 text-lg font-bold tabular-nums ${tone.className}`}
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
