'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import MediaThumb from './media-thumb';
import Icon from '@/ui/primitives/icon';
import { getTimelineCredits } from '@/domains/media/utils/person-data';

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
      <div className="p-6">
        <div className="relative mx-auto max-w-2xl">
          <div className="absolute top-2 bottom-0 left-16 w-px origin-top bg-white/10 sm:left-24" />

          <div className="flex flex-col">
            {timeline.map(([year, credits], yearIndex) => {
              const isLast = yearIndex === timeline.length - 1;
              return (
                <div key={year} className="relative flex">
                  <div className="w-16 shrink-0 sm:w-24">
                    <span className="block pt-1 pr-3 text-right text-xs font-bold tracking-wide text-white/50 sm:pr-4 sm:text-base">
                      {year}
                    </span>
                  </div>

                  <div className="absolute top-1 left-16 z-10 size-3 -translate-x-1/2 border-2 border-black bg-white sm:left-24" />

                  <div
                    className={`flex min-w-0 flex-1 flex-col gap-1 pl-4 sm:pl-8 ${isLast ? 'pb-0' : 'pb-10'}`}
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
                        <Link
                          key={`${credit.credit_id || credit.id}-${credit.media_type}`}
                          href={`/${mediaType}/${credit.id}`}
                          className="group flex cursor-pointer items-center gap-4 p-1 transition-all duration-300 ease-in-out hover:bg-white/5 hover:backdrop-blur-sm"
                        >
                          <MediaThumb
                            poster={credit.poster_path}
                            alt={title}
                            className="w-16 sm:w-20"
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate text-base leading-tight font-semibold tracking-tight sm:text-lg">
                              {title}
                            </span>
                            {creditLabel && (
                              <span className="truncate text-sm text-white/50">{creditLabel}</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
