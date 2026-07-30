'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/core/utils';
import { Input } from '@/ui/elements';
import Icon from '@/ui/icon';
import { SEARCH_STYLES, SEARCH_TAB_ITEMS } from '@/features/search/constants';
import { navActionClass } from '../utils';

import { useEffect, useState } from 'react';

function PaginationArrow({ direction, onClick }) {
  const isLeft = direction === 'left';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, width: 0 }}
      animate={{ opacity: 1, scale: 1, width: 'auto' }}
      exit={{ opacity: 0, scale: 0.8, width: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.24, 1] }}
      className={`overflow-hidden shrink-0 ${isLeft ? 'mr-1.5' : 'ml-1.5'}`}
    >
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }}
        className={cn(
          navActionClass({
            cn,
            button: SEARCH_STYLES.tabButton,
            isActive: false,
          }),
          'center h-[38px] w-[38px] p-0 cursor-pointer !rounded-2xl',
        )}
        onClick={onClick}
      >
        <Icon
          icon={isLeft ? 'solar:alt-arrow-left-linear' : 'solar:alt-arrow-right-linear'}
          size={16}
          className="text-black/70"
        />
      </motion.button>
    </motion.div>
  );
}

export default function SearchActionControls({
  loading = false,
  query = '',
  searchType,
  showTabs = true,
  showTabsWhenEmpty = false,
  hasPrevPage = false,
  hasNextPage = false,
  onClear,
  onQueryChange,
  onSearchTypeChange,
  onPrevPage,
  onNextPage,
}) {
  const shouldShowTabs = showTabs && (showTabsWhenEmpty || Boolean(query.trim()));
  const [isActive, setIsActive] = useState(false);
  return (
    <>
      <div className="flex items-center w-full">
        <AnimatePresence>
          {hasPrevPage && <PaginationArrow direction="left" onClick={onPrevPage} />}
        </AnimatePresence>
        <div className="flex-1 min-w-0">
          <Input
            value={query}
            onFocus={() => setIsActive(true)}
            onBlur={() => setIsActive(false)}
            classNames={{
              input: 'w-full text-sm placeholder:text-black/50 outline-none',
              wrapper: navActionClass({
                cn,
                button: SEARCH_STYLES.input,
                isActive,
              }),
              leftIcon: 'mr-2 center shrink-0',
            }}
            enterKeyHint="search"
            leftIcon={
              <Icon
                className={`${query ? 'text-black' : 'text-black/50'}`}
                icon="solar:magnifer-linear"
                size={16}
              />
            }
            placeholder="Search movies, TV series, people or users"
            type="text"
            spellCheck={false}
            onChange={(event) => onQueryChange?.(event.target.value)}
            rightIcon={
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.24, 1] }}
                    className="center shrink-0"
                  >
                    <Icon icon="line-md:loading-loop" size={16} />
                  </motion.div>
                ) : query ? (
                  <motion.button
                    key="clear"
                    type="button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.24, 1] }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.97 }}
                    className="center text-error shrink-0 cursor-pointer"
                    onClick={onClear}
                  >
                    <Icon icon="material-symbols:close-rounded" size={16} />
                  </motion.button>
                ) : null}
              </AnimatePresence>
            }
          />
        </div>
        <AnimatePresence>
          {hasNextPage && <PaginationArrow direction="right" onClick={onNextPage} />}
        </AnimatePresence>
      </div>

      {shouldShowTabs ? (
        <motion.div
          className="mt-2 overflow-hidden"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.24, 1] }}
        >
          <div className={SEARCH_STYLES.tabList}>
            {SEARCH_TAB_ITEMS.map((item) => {
              const isActive = searchType === item.key;
              return (
                <motion.button
                  key={item.key}
                  type="button"
                  className={cn(
                    navActionClass({
                      cn,
                      button: SEARCH_STYLES.tabButton,
                      isActive,
                    }),
                    'group',
                  )}
                  onClick={() => onSearchTypeChange?.(item.key)}
                  whileHover={{ scale: 1.012 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }}
                >
                  <span className="relative">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </>
  );
}
