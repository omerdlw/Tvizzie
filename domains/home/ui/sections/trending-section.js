'use client';

import { motion } from 'framer-motion';
import { homeSectionVariants } from '@/app/(home)/motion';
import { PosterRail } from '../components/poster-rail';

function getUniqueItems(items = [], limit = items.length) {
  const seen = new Set();
  return items
    .filter((item) => {
      const id = item?.id;
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    })
    .slice(0, limit);
}

export function TrendingSection({ title, items = [] }) {
  const railItems = getUniqueItems(items, 12);

  if (!railItems.length) {
    return null;
  }

  return (
    <motion.section
      variants={homeSectionVariants}
      className="mx-auto flex w-full max-w-5xl flex-col gap-3"
    >
      <h2 className="text-[11px] font-semibold tracking-wider text-black/70 uppercase">{title}</h2>
      <PosterRail items={railItems} />
    </motion.section>
  );
}
