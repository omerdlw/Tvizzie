'use client';

import SearchResultItem from './item';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchActionResultsPreview({
  imageErrors = {},
  query = '',
  results = [],
  onImageError,
  onSelect,
}) {
  const hasQuery = Boolean(query.trim());
  return (
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
                stiffness: 140,
                damping: 20,
                mass: 1.1,
                delay: index * 0.045,
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
