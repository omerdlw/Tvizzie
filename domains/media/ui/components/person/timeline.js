'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import MediaThumb from './media-thumb';
import Icon from '@/ui/primitives/icon';
import { getTimelineCredits } from '@/domains/media/utils/person-data';
import { MediaRouteReveal } from '@/app/(media)/motion';

function groupByYear(credits) {
  const grouped = {};
  credits.forEach((credit) => {
    const year =
      credit.release_date || credit.first_air_date
        ? (credit.release_date || credit.first_air_date).slice(0, 4)
        : '—';
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(credit);
  });
  return Object.entries(grouped).sort(([a], [b]) => {
    if (a === '—') return 1;
    if (b === '—') return -1;
    return Number(b) - Number(a);
  });
}

function getCreditLabel(credit) {
  if (credit.character) return `as ${credit.character}`;
  if (credit.job) return credit.job;
  if (credit.department) return credit.department;
  return null;
}

export default function PersonTimeline({ person }) {
  const timeline = useMemo(() => groupByYear(getTimelineCredits(person)), [person]);
  if (!timeline.length) return null;

  return (
    <section className="relative w-full">
      <div className="relative flex min-h-14 w-full items-center justify-between gap-4 px-4">
        <MediaRouteReveal stage="person.sections.timeline" deferred>
          <div className="flex min-w-0 items-center gap-2">
            <Icon icon="solar:sort-by-time-bold" size={24} className="text-black/70" />
            <h2 className="min-w-0 text-xs font-semibold tracking-widest text-black/70 uppercase">
              Timeline
            </h2>
          </div>
        </MediaRouteReveal>
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
      </div>

      <div className="p-6">
        <div className="relative">
          <div
            className="absolute top-[18px] bottom-0 left-16 w-px origin-top bg-black/10 sm:left-24"
          />

          <div className="flex flex-col">
            {timeline.map(([year, credits], yearIndex) => {
              const isLast = yearIndex === timeline.length - 1;
              return (
                <div key={year} className="relative flex">
                  <MediaRouteReveal
                    className="w-16 shrink-0 sm:w-24"
                    deferred
                    itemIndex={yearIndex}
                    stage="person.timeline.year"
                  >
                    <span
                      className="block pt-3 pr-3 text-right text-xs font-bold tracking-wide text-black/50 sm:pr-4 sm:text-base"
                    >
                      {year}
                    </span>
                  </MediaRouteReveal>

                  <div
                    className="absolute top-[18px] left-16 z-10 size-3 -translate-x-1/2 rounded-full border-2 border-white bg-black sm:left-24"
                  />

                  <div
                    className={`min-w-0 flex-1 pt-[18px] pl-4 sm:pl-8 ${isLast ? 'pb-0' : 'pb-10'}`}
                  >
                    {credits.map((credit, creditIndex) => {
                      const mediaType = credit.media_type === 'tv' ? 'tv' : 'movie';
                      const title =
                        credit.title ||
                        credit.original_title ||
                        credit.name ||
                        credit.original_name ||
                        'Untitled';
                      const creditLabel = getCreditLabel(credit);
                      return (
                        <MediaRouteReveal
                          key={`${credit.credit_id || credit.id}-${credit.media_type}`}
                          deferred
                          interactive
                          itemIndex={yearIndex * 4 + creditIndex}
                          stage="person.timeline.item"
                        >
                          <Link
                            href={`/${mediaType}/${credit.id}`}
                            className="group flex items-center gap-4 rounded-[20px] p-1 transition-[background-color] duration-300 ease-out hover:bg-black/5"
                          >
                            <MediaThumb
                              poster={credit.poster_path}
                              alt={title}
                              className="w-16 rounded-2xl sm:w-20"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="truncate text-base leading-tight font-semibold tracking-tight sm:text-lg">
                                {title}
                              </span>
                              {creditLabel && (
                                <span className="truncate text-sm text-black/50">
                                  {creditLabel}
                                </span>
                              )}
                            </div>
                          </Link>
                        </MediaRouteReveal>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
    </section>
  );
}
