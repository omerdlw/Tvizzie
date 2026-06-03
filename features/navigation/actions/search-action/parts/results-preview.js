'use client';

import { cn } from '@/core/utils';
import SearchResultItem from './item';
import { navActionClass } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_ACTION_SPRING } from '@/core/modules/motion';

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
      <AnimatePresence>
        {results.length > 0 && hasQuery ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className="mt-2 flex flex-col gap-1 overflow-hidden"
          >
            {results.map((item, index) => (
              <motion.div
                key={`${item.media_type}-${item.id}`}
                initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0.001px)' }}
                exit={{ opacity: 0, x: 8, filter: 'blur(3px)' }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 30,
                  mass: 0.8,
                  delay: index * 0.03,
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

      <AnimatePresence>
        {hasQuery ? (
          <motion.div
            initial={{ opacity: 0, filter: 'blur(3px)', height: 0 }}
            animate={{ opacity: 1, filter: 'blur(0.001px)', height: 'auto' }}
            exit={{ opacity: 0, filter: 'blur(3px)', height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="mt-2 overflow-hidden"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              transition={NAV_ACTION_SPRING}
              className={navActionClass({
                button: 'relative w-full shrink-0 px-3 py-1.5 text-left text-xs whitespace-nowrap',
                cn,
              })}
              onClick={onSeeAllResults}
            >
              See all results
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
