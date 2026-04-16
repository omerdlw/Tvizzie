'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/core/utils';
import { Input } from '@/ui/elements';
import Icon from '@/ui/icon';

import { SEARCH_STYLES, SEARCH_TAB_ITEMS } from '../constants';
import { navActionClass } from '../utils';
import { useState } from 'react';

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
          input: 'w-full placeholder:text-black/50 outline-none',
          wrapper: navActionClass({
            cn,
            button: SEARCH_STYLES.input,
            isActive,
          }),
          leftIcon: 'mr-2 center shrink-0',
        }}
        leftIcon={
          <Icon
            className={`${query ? 'text-black' : 'text-black/50'} transition-colors duration-(--motion-duration-normal)`}
            icon="solar:magnifer-linear"
            size={16}
          />
        }
        placeholder="Search movies, people or users"
        value={query}
        spellCheck={false}
        onChange={(event) => onQueryChange?.(event.target.value)}
        rightIcon={
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                className="center shrink-0"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
              >
                <Icon icon="line-md:loading-loop" size={16} />
              </motion.div>
            ) : query ? (
              <motion.button
                key="clear"
                type="button"
                className="center text-error shrink-0 cursor-pointer"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
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
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
          >
            <div className={SEARCH_STYLES.tabList}>
              {SEARCH_TAB_ITEMS.map((item) => {
                const isActive = searchType === item.key;

                return (
                  <button
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
                  >
                    <span className="relative">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
