'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { PersonSurfaceReveal } from '@/features/media/static-route-elements';
import MediaThumb from './media-thumb';
import { getTimelineCredits } from './utils';

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
    <PersonSurfaceReveal>
      <section className="w-full">
        <div className="relative">
          <div className="absolute top-[18px] bottom-0 left-20 w-px bg-black/10 sm:left-24" />

          <div className="flex flex-col">
            {timeline.map(([year, credits], yearIndex) => {
              const isLast = yearIndex === timeline.length - 1;
              return (
                <div key={year} className="relative flex">
                  <div className="w-20 shrink-0 sm:w-24">
                    <span className="block pt-3 pr-4 text-right text-sm font-bold tracking-wide text-black/50 sm:text-base">
                      {year}
                    </span>
                  </div>

                  <div className="absolute top-[18px] left-20 z-10 size-3 -translate-x-1/2 rounded-full border-2 border-white bg-black shadow-sm sm:left-24" />

                  <div
                    className={`min-w-0 flex-1 pt-[18px] pl-6 sm:pl-8 ${isLast ? 'pb-0' : 'pb-10'}`}
                  >
                    {credits.map((credit) => {
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
                          className="group flex items-center gap-4 rounded-[20px] p-1 transition-colors hover:bg-black/5"
                        >
                          <MediaThumb
                            poster={credit.poster_path}
                            alt={title}
                            className="w-16 rounded-[16px] sm:w-20"
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate text-base leading-tight font-semibold tracking-tight sm:text-lg">
                              {title}
                            </span>
                            {creditLabel && (
                              <span className="truncate text-sm text-black/50">{creditLabel}</span>
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
      </section>
    </PersonSurfaceReveal>
  );
}
