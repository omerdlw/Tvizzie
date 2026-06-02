'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { NAV_ACTION_SPRING, NAV_SEARCH_REVEAL_TRANSITION, NAV_SURFACE_ITEM_SPRING } from '@/core/modules/nav/motion';
import { cn } from '@/core/utils';

import SearchResultItem from './item';
import { navActionClass } from '../utils';

export default function SearchActionResultsPreview({
  imageErrors = {},
  query = '',
  results = [],
  onImageError,
  onSeeAllResults,
  onSelect,
}) {
  const hasQuery = Boolean(query.trim());

  return (
    <>
      <AnimatePresence initial={false}>
        {results.length > 0 && hasQuery ? (
          <motion.div
            layout="position"
            className="mt-2 flex flex-col gap-1 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={NAV_SEARCH_REVEAL_TRANSITION}
          >
            {results.map((item, index) => (
              <motion.div
                key={`${item.media_type}-${item.id}`}
                initial={{ opacity: 0, y: 6, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.985 }}
                transition={{ ...NAV_SURFACE_ITEM_SPRING, delay: Math.min(index * 0.018, 0.08) }}
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

      <AnimatePresence initial={false}>
        {hasQuery ? (
          <motion.div
            className="mt-2 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={NAV_SEARCH_REVEAL_TRANSITION}
          >
            <motion.button
              type="button"
              className={navActionClass({
                button: 'relative w-full shrink-0 px-3 py-1.5 text-left text-xs whitespace-nowrap transition-colors',
                cn,
              })}
              onClick={onSeeAllResults}
              whileTap={{ scale: 0.985 }}
              transition={NAV_ACTION_SPRING}
            >
              See all results
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
