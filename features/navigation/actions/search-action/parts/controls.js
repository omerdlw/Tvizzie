'use client';

import { useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/core/utils';
import { NAV_ACTION_SPRING, NAV_CONTENT_TRANSITION, NAV_SEARCH_REVEAL_TRANSITION } from '@/core/modules/nav/motion';
import { Input } from '@/ui/elements';
import Icon from '@/ui/icon';

import { SEARCH_STYLES, SEARCH_TAB_ITEMS } from '../constants';
import { navActionClass } from '../utils';

export default function SearchActionControls({
  loading = false,
  query = '',
  searchType,
  showTabs = true,
  showTabsWhenEmpty = false,
  onClear,
  onQueryChange,
  onSearchTypeChange,
}) {
  const shouldShowTabs = showTabs && (showTabsWhenEmpty || Boolean(query.trim()));
  const [isActive, setIsActive] = useState(false);

  return (
    <>
      <Input
        onFocus={() => setIsActive(true)}
        onBlur={() => setIsActive(false)}
        classNames={{
          input: 'w-full text-base placeholder:text-black/50 outline-none md:text-sm',
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
            className={`${query ? 'text-black' : 'text-black/50'} transition-colors duration-[300ms]`}
            icon="solar:magnifer-linear"
            size={16}
          />
        }
        placeholder="Search movies, people or users"
        type="text"
        value={query}
        spellCheck={false}
        onChange={(event) => onQueryChange?.(event.target.value)}
        rightIcon={
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                className="center shrink-0"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={NAV_ACTION_SPRING}
              >
                <Icon icon="line-md:loading-loop" size={16} />
              </motion.div>
            ) : query ? (
              <motion.button
                key="clear"
                type="button"
                className="center text-error shrink-0 cursor-pointer"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={NAV_ACTION_SPRING}
                onClick={onClear}
              >
                <Icon icon="material-symbols:close-rounded" size={16} />
              </motion.button>
            ) : null}
          </AnimatePresence>
        }
      />

      <AnimatePresence>
        {shouldShowTabs ? (
          <motion.div
            className="mt-2 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={NAV_SEARCH_REVEAL_TRANSITION}
          >
            <motion.div className={SEARCH_STYLES.tabList} layout="position" transition={NAV_CONTENT_TRANSITION}>
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
                      'group'
                    )}
                    onClick={() => onSearchTypeChange?.(item.key)}
                    whileTap={{ scale: 0.98 }}
                    transition={NAV_ACTION_SPRING}
                  >
                    <span className="relative">{item.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
