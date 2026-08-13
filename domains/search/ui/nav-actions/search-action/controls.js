'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { NAV_BUTTON_TRANSITION, NAV_FADE_TRANSITION, NAV_TAP_SCALE } from '@/modules/nav/motion';
import { cn } from '@/shared/utils';
import { Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { SEARCH_STYLES, SEARCH_TAB_ITEMS } from '@/domains/search/utils';
import { navActionClass } from './search-action-helpers';

import { useState } from 'react';

function PaginationArrow({ direction, onClick }) {
  const isLeft = direction === 'left';
  return (
    <div className={`shrink-0 overflow-hidden ${isLeft ? 'mr-1.5' : 'ml-1.5'}`}>
      <motion.button
        type="button"
        className={cn(
          navActionClass({
            cn,
            button: SEARCH_STYLES.tabButton,
            isActive: false,
          }),
          'center h-[38px] w-[38px] cursor-pointer p-0',
        )}
        onClick={onClick}
        whileHover={{ x: isLeft ? -2 : 2 }}
        whileTap={{ scale: NAV_TAP_SCALE }}
        transition={NAV_BUTTON_TRANSITION}
      >
        <Icon
          icon={isLeft ? 'solar:alt-arrow-left-linear' : 'solar:alt-arrow-right-linear'}
          size={16}
          className="text-black/70"
        />
      </motion.button>
    </div>
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
      <div className="flex w-full items-center">
        {hasPrevPage && <PaginationArrow direction="left" onClick={onPrevPage} />}
        <div className="min-w-0 flex-1">
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
              loading ? (
                <div className="center shrink-0">
                  <Icon icon="line-md:loading-loop" size={16} />
                </div>
              ) : query ? (
                <button
                  type="button"
                  className="center text-error shrink-0 cursor-pointer"
                  onClick={onClear}
                >
                  <Icon icon="material-symbols:close-rounded" size={16} />
                </button>
              ) : null
            }
          />
        </div>
        {hasNextPage && <PaginationArrow direction="right" onClick={onNextPage} />}
      </div>

      <AnimatePresence initial={false}>
        {shouldShowTabs ? (
          <motion.div
            className="mt-2 overflow-hidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={NAV_FADE_TRANSITION}
          >
            <div className={SEARCH_STYLES.tabList}>
              {SEARCH_TAB_ITEMS.map((item) => {
                const isActive = searchType === item.key;
                return (
                  <motion.button
                    key={item.key}
                    type="button"
                    className={navActionClass({
                      cn,
                      button: SEARCH_STYLES.tabButton,
                      isActive,
                    })}
                    onClick={() => onSearchTypeChange?.(item.key)}
                    whileTap={{ scale: NAV_TAP_SCALE }}
                    transition={NAV_BUTTON_TRANSITION}
                  >
                    {item.label}
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
