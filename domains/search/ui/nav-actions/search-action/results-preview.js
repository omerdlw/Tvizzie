'use client';

import { AnimatePresence, motion } from 'framer-motion';

import {
  NAV_RESULTS_EXIT_TRANSITION,
  NAV_RESULTS_STAGGER_DELAY,
  NAV_RESULTS_TRANSITION,
} from '@/modules/nav/motion';

import SearchResultItem from './item';

export default function SearchActionResultsPreview({
  imageErrors = {},
  query = '',
  searchType = 'all',
  currentPage = 0,
  results = [],
  resultSetId = 0,
  onImageError,
  onSelect,
}) {
  const hasQuery = Boolean(query.trim());
  const hasResults = results.length > 0;
  const resultListKey = `${resultSetId}:${query}:${searchType}:${currentPage}`;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {hasQuery && hasResults ? (
        <motion.div
          key={resultListKey}
          className="mt-2 flex flex-col gap-1 overflow-hidden"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: NAV_RESULTS_EXIT_TRANSITION }}
          transition={NAV_RESULTS_TRANSITION}
        >
          {results.map((item, index) => (
            <motion.div
              key={`${item.media_type}-${item.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: NAV_RESULTS_EXIT_TRANSITION }}
              transition={{
                ...NAV_RESULTS_TRANSITION,
                delay: 0.04 + index * NAV_RESULTS_STAGGER_DELAY,
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
      ) : null}
    </AnimatePresence>
  );
}
