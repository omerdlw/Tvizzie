'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { getPersonAwardsServer } from '@/domains/media/api/person-awards.server';
import { EASINGS, heroTitleVariants } from '@/app/(media)/motion';
import { Spinner } from '@/ui/feedback/spinner';

function buildTimeline(organizations = []) {
  return organizations
    .flatMap((organization) =>
      (organization?.years || []).flatMap((year) =>
        (year?.categories || []).map((award) => ({
          category: award.category,
          key: `${organization.id}-${year.year}-${award.key}`,
          organization: organization.title,
          project: award.project,
          type: award.type,
          year: year.year || '—',
        })),
      ),
    )
    .sort((left, right) => right.year.localeCompare(left.year) || left.category.localeCompare(right.category));
}

function AwardsMessage({ children }) {
  return <p className="py-20 text-center text-sm font-medium text-black/70">{children}</p>;
}

export default function PersonAwards({ personId }) {
  const [awardsData, setAwardsData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isCurrent = true;
    setStatus('loading');

    void getPersonAwardsServer({ personId }).then((response) => {
      if (!isCurrent) return;
      if (!response?.success) {
        setAwardsData(null);
        setStatus('error');
        return;
      }
      setAwardsData(response.data);
      setStatus('ready');
    });

    return () => {
      isCurrent = false;
    };
  }, [personId]);

  const timeline = useMemo(() => buildTimeline(awardsData?.organizations), [awardsData]);
  if (status === 'loading') return <Spinner size={32} className="mx-auto mt-10 block" />;
  if (status === 'error') return <AwardsMessage>Awards are temporarily unavailable</AwardsMessage>;
  if (!timeline.length) return <AwardsMessage>No awards information found</AwardsMessage>;

  const wins = awardsData?.stats?.totalWins || 0;
  const nominations = awardsData?.stats?.totalNominations || 0;

  return (
    <section className="w-full">
      <motion.div {...heroTitleVariants} className="mx-auto max-w-[72ch] text-center">
        <h2 className="font-zuume text-5xl leading-none font-bold uppercase sm:text-7xl lg:text-8xl">
          {wins} {wins === 1 ? 'WIN' : 'WINS'}
        </h2>
        <p className="mt-3 text-sm font-semibold tracking-[0.16em] text-black/50 uppercase">
          {nominations} {nominations === 1 ? 'NOMINATION' : 'NOMINATIONS'}
        </p>
      </motion.div>
      <div className="mx-auto mt-8 flex max-w-[72ch] flex-col gap-3 sm:mt-12">
        {timeline.map((award, index) => (
          <motion.div
            key={award.key}
            initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.55, delay: Math.min(index * 0.035, 0.45), ease: EASINGS.LUXURY }}
            className="grid grid-cols-[4rem_minmax(0,1fr)] gap-4 rounded-2xl border border-black/10 bg-white/40 p-4 sm:grid-cols-[5rem_minmax(0,1fr)]"
          >
            <span className="text-sm font-bold text-black/50">{award.year}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-black">{award.category}</span>
                <span className="rounded-full bg-black px-2 py-0.5 text-[0.65rem] font-bold tracking-wider text-white uppercase">
                  {award.type}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-black/55">
                {[award.organization, award.project].filter(Boolean).join(' · ')}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
