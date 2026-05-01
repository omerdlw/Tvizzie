'use client';

import { useMemo } from 'react';

import { motion } from 'framer-motion';
import Link from 'next/link';

import { PersonSurfaceReveal, getPersonSurfaceItemMotion } from '@/app/(media)/person/[id]/motion';
import MediaThumb from './media-thumb';
import { getTimelineCredits } from './utils';

function groupByYear(credits) {
  const grouped = {};

  credits.forEach((credit) => {
    const year = credit.release_date ? credit.release_date.slice(0, 4) : '—';

    if (!grouped[year]) {
      grouped[year] = [];
    }

    grouped[year].push(credit);
  });

  return Object.entries(grouped).sort(([firstYear], [secondYear]) => {
    if (firstYear === '—') return 1;
    if (secondYear === '—') return -1;
    return Number(secondYear) - Number(firstYear);
  });
}

function getCreditLabel(credit) {
  if (credit.character) {
    return `as ${credit.character}`;
  }

  if (credit.job) {
    return credit.job;
  }

  if (credit.department) {
    return credit.department;
  }

  return null;
}

export default function PersonTimeline({ person }) {
  const timeline = useMemo(() => groupByYear(getTimelineCredits(person)), [person]);

  if (!timeline.length) return null;

  return (
    <PersonSurfaceReveal>
      <section className="flex w-full flex-col gap-3">
        <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Timeline</h2>

        {timeline.map(([year, credits], yearIndex) => {
          const yearMotion = getPersonSurfaceItemMotion({
            index: yearIndex,
            distance: 18,
            duration: 0.64,
            delayStep: 0.088,
            scale: 0.986,
          });

          return (
            <motion.div
              key={year}
              className="mt-4 first:mt-0"
              initial={yearMotion.initial}
              animate={yearMotion.animate}
              transition={yearMotion.transition}
            >
              <div className="mb-2 flex items-center gap-2 sm:gap-3">
                <span className="w-9 shrink-0 text-right text-xs font-semibold text-black/70 sm:w-12 sm:text-[13px]">
                  {year}
                </span>
                <div className="h-px flex-1 bg-black/20" />
              </div>

              <div className="ml-0 flex flex-col sm:ml-16">
                {credits.map((credit, creditIndex) => {
                  const title = credit.title || credit.original_title || 'Untitled';
                  const creditLabel = getCreditLabel(credit);
                  const creditMotion = getPersonSurfaceItemMotion({
                    axis: 'x',
                    distance: -14,
                    duration: 0.48,
                    groupIndex: yearIndex,
                    groupDelayStep: 0.088,
                    index: creditIndex,
                    delayStep: 0.028,
                    scale: 0.992,
                  });

                  return (
                    <motion.div
                      key={`${credit.credit_id || credit.id}-${credit.media_type}`}
                      initial={creditMotion.initial}
                      animate={creditMotion.animate}
                      transition={creditMotion.transition}
                    >
                      <Link
                        href={`/movie/${credit.id}`}
                        className="group hover:bg-primary flex items-end gap-3 border border-transparent p-1 transition"
                      >
                        <MediaThumb poster={credit.poster_path} alt={title} className="" />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold tracking-tight sm:text-lg">{title}</span>
                          </div>
                          {creditLabel && (
                            <span className="truncate text-xs text-black/70 sm:text-sm">{creditLabel}</span>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </section>
    </PersonSurfaceReveal>
  );
}
