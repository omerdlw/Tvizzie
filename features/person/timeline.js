'use client';

import { useMemo } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

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
  const reduceMotion = useReducedMotion();
  const timeline = useMemo(() => groupByYear(getTimelineCredits(person)), [person]);

  if (!timeline.length) return null;

  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Timeline</h2>

      {timeline.map(([year, credits], yearIndex) => (
        <motion.div
          key={year}
          className="mt-4 first:mt-0"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: reduceMotion ? 0 : yearIndex * 0.045,
            duration: reduceMotion ? 0.16 : 0.36,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="mb-2 flex items-center gap-2 sm:gap-3">
            <span className="w-9 shrink-0 text-right text-xs font-semibold text-black/70 sm:w-12 sm:text-[13px]">
              {year}
            </span>
            <div className="h-px flex-1 bg-black/15" />
          </div>

          <div className="ml-0 flex flex-col sm:ml-16">
            {credits.map((credit, creditIndex) => {
              const title = credit.title || credit.original_title || 'Untitled';
              const creditLabel = getCreditLabel(credit);

              return (
                <motion.div
                  key={`${credit.credit_id || credit.id}-${credit.media_type}`}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: reduceMotion ? 0 : yearIndex * 0.045 + creditIndex * 0.02,
                    duration: reduceMotion ? 0.16 : 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link
                    href={`/movie/${credit.id}`}
                    className="group hover:bg-primary/35 flex items-end gap-2.5 border border-transparent p-1 transition-colors hover:border-black/10 sm:gap-3"
                  >
                    <MediaThumb poster={credit.poster_path} alt={title} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold tracking-tight text-black sm:text-lg">
                          {title}
                        </span>
                      </div>
                      {creditLabel && (
                        <span className="truncate text-[11px] text-black/70 sm:text-sm">{creditLabel}</span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </section>
  );
}
