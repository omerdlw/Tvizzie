'use client';

import { useState } from 'react';
import { cn } from '@/core/utils';
import { Input } from '@/ui/elements';
import Icon from '@/ui/icon';
import { SEARCH_STYLES, SEARCH_TAB_ITEMS } from '@/features/search/constants';
import { navActionClass } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_ACTION_SPRING, NAV_SEARCH_PANEL_MOTION } from '@/core/modules/motion';

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
          <Icon className={`${query ? 'text-black' : 'text-black/50'}`} icon="solar:magnifer-linear" size={16} />
        }
        placeholder="Search movies, TV series, people or users"
        type="text"
        spellCheck={false}
        onChange={(event) => onQueryChange?.(event.target.value)}
        rightIcon={
          <>
            {loading ? (
              <div key="loading" className="center shrink-0">
                <Icon icon="line-md:loading-loop" size={16} />
              </div>
            ) : query ? (
              <motion.button
                key="clear"
                type="button"
                whileTap={{ scale: 0.98 }}
                transition={NAV_ACTION_SPRING}
                className="center text-error shrink-0 cursor-pointer"
                onClick={onClear}
              >
                <Icon icon="material-symbols:close-rounded" size={16} />
              </motion.button>
            ) : null}
          </>
        }
      />

      <AnimatePresence>
        {shouldShowTabs ? (
          <motion.div {...NAV_SEARCH_PANEL_MOTION} className="mt-2 overflow-hidden">
            <div className={SEARCH_STYLES.tabList}>
              {SEARCH_TAB_ITEMS.map((item) => {
                const isActive = searchType === item.key;
                return (
                  <motion.button
                    key={item.key}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    transition={NAV_ACTION_SPRING}
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
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
