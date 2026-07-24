'use client';

import { motion, AnimatePresence } from 'framer-motion';
import SearchResultItem from './item';
import {
  NAV_STAGGER_DELAY,
  NAV_STAGGER_TRANSITION,
  staggerContainerVariants,
  staggerItemVariants,
} from '@/core/modules/nav/motion';

export default function SearchActionResultsPreview({
  imageErrors = {},
  query = '',
  results = [],
  onImageError,
  onSelect,
}) {
  const hasQuery = Boolean(query.trim());
  const hasResults = results.length > 0;

  return (
    <AnimatePresence mode="wait">
      {hasQuery && hasResults && (
        <motion.div
          key={`results-${query}`}
          className="mt-2 flex flex-col gap-1 overflow-hidden"
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {results.map((item, index) => (
            <motion.div
              key={`${item.media_type}-${item.id}`}
              variants={staggerItemVariants}
              transition={{
                ...NAV_STAGGER_TRANSITION,
                delay: index * NAV_STAGGER_DELAY,
              }}
            >
              <SearchResultItem
                item={item}
                imageErrors={imageErrors}
                onImageError={onImageError}
                onSelect={onSelect}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
