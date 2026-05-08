'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/core/utils';
import { Input } from '@/ui/elements';
import Icon from '@/ui/icon';

import { SEARCH_ACTION_TAB_ITEMS, SEARCH_STYLES } from '@/features/search/constants';
import { navActionClass } from '../utils';
import { SEARCH_ACTION_EXIT_TRANSITION, SEARCH_ACTION_REVEAL_TRANSITION } from '../motion';

export default function SearchActionControls({
  loading = false,
  query = '',
  searchType,
  showTabs = true,
  showTabsWhenEmpty = false,
  tabItems = SEARCH_ACTION_TAB_ITEMS,
  onClear,
  onQueryChange,
  onSearchTypeChange,
}) {
  const shouldShowTabs = showTabs && (showTabsWhenEmpty || Boolean(query.trim()));
  const [isActive, setIsActive] = useState(false);
  const allowsCommunityTypes = tabItems.some((item) => item.key === 'list' || item.key === 'review');
  const placeholder = allowsCommunityTypes
    ? 'Search movies, people, users, lists or reviews'
    : 'Search movies, people or users';

  return (
    <>
      <Input
        onFocus={() => setIsActive(true)}
        onBlur={() => setIsActive(false)}
        classNames={{
          input: 'w-full text-sm text-white outline-none placeholder:text-white/50',
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
            className={cn(query ? 'text-white' : 'text-white/50', 'transition-colors duration-[300ms]')}
            icon="solar:magnifer-linear"
            size={16}
          />
        }
        placeholder={placeholder}
        type="text"
        value={query}
        spellCheck={false}
        onChange={(event) => onQueryChange?.(event.target.value)}
        rightIcon={<SearchActionRightIcon loading={loading} query={query} onClear={onClear} />}
      />

      <AnimatePresence initial={false}>
        {shouldShowTabs ? (
          <motion.div
            key="search-tabs"
            className="mt-2 overflow-hidden"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0, transition: SEARCH_ACTION_EXIT_TRANSITION }}
            transition={SEARCH_ACTION_REVEAL_TRANSITION}
          >
            <div className={SEARCH_STYLES.tabList}>
              {tabItems.map((item, index) => (
                <motion.button
                  key={item.key}
                  type="button"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: SEARCH_ACTION_EXIT_TRANSITION }}
                  transition={{ ...SEARCH_ACTION_REVEAL_TRANSITION, delay: Math.min(index * 0.05, 0.15) }}
                  className={cn(
                    navActionClass({
                      cn,
                      button: SEARCH_STYLES.tabButton,
                      isActive: searchType === item.key,
                    }),
                    'group'
                  )}
                  onClick={() => onSearchTypeChange?.(item.key)}
                >
                  <span className="relative">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function SearchActionRightIcon({ loading, query, onClear }) {
  if (loading) {
    return (
      <div className="center shrink-0">
        <Icon icon="line-md:loading-loop" size={16} />
      </div>
    );
  }

  if (!query) {
    return null;
  }

  return (
    <button type="button" className="center text-error shrink-0 cursor-pointer" onClick={onClear}>
      <Icon icon="material-symbols:close-rounded" size={16} />
    </button>
  );
}
