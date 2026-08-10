'use client';

import { motion } from 'framer-motion';
import Carousel from '@/domains/media/ui/components/media-carousel';
import MediaPosterCard from '@/domains/media/ui/components/media-poster-card';
import { getTrendingCardProps } from '@/domains/home/ui/motion';

export function PosterRail({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <Carousel gap="gap-3" itemClassName="w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-3.75rem)/6)]">
      {items.map((item, index) => (
        <motion.div key={item.id} {...getTrendingCardProps(index)}>
          <MediaPosterCard item={item} />
        </motion.div>
      ))}
    </Carousel>
  );
}
