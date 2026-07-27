'use client';

import { motion, AnimatePresence } from 'framer-motion';
import SearchResultItem from './item';
const SEARCH_CONTAINER_VARIANTS = Object.freeze({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.015,
      staggerDirection: -1,
    },
  },
});

const SEARCH_ITEM_VARIANTS = Object.freeze({
  hidden: { opacity: 0, y: 20, scale: 0.96, filter: 'blur(12px)' },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: [0.16, 1, 0.24, 1] }
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    scale: 0.98,
    filter: 'blur(6px)',
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
  },
});

export default function SearchActionResultsPreview({
  imageErrors = {},
  query = '',
  searchType = 'all',
  currentPage = 0,
  results = [],
  onImageError,
  onSelect,
}) {
  const hasQuery = Boolean(query.trim());
  const hasResults = results.length > 0;

  return (
    <AnimatePresence mode="popLayout">
      {hasQuery && hasResults && (
        <motion.div
          key={`results-${query}-${searchType}-${currentPage}`}
          className="mt-2 flex flex-col gap-1 overflow-hidden"
          variants={SEARCH_CONTAINER_VARIANTS}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {results.map((item) => (
            <motion.div
              key={`${item.media_type}-${item.id}`}
              variants={SEARCH_ITEM_VARIANTS}
              style={{ willChange: 'transform, filter, opacity' }}
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
