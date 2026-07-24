'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/core/utils';
import { Input } from '@/ui/elements';
import Icon from '@/ui/icon';
import { SEARCH_STYLES, SEARCH_TAB_ITEMS } from '@/features/search/constants';
import { navActionClass } from '../utils';
import { NAV_TAP_SCALE } from '@/core/modules/nav/motion';

function PaginationArrow({ direction, onClick }) {
  const isLeft = direction === 'left';
  return (
    <div className={`overflow-hidden shrink-0 ${isLeft ? 'mr-1.5' : 'ml-1.5'}`}>
      <button
        type="button"
        className={cn(
          navActionClass({
            cn,
            button: SEARCH_STYLES.tabButton,
            isActive: false,
          }),
          'center h-[38px] w-[38px] p-0 cursor-pointer !rounded-[16px]',
        )}
        onClick={onClick}
      >
        <Icon
          icon={isLeft ? 'solar:alt-arrow-left-linear' : 'solar:alt-arrow-right-linear'}
          size={16}
          className="text-black/70"
        />
      </button>
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
      <div className="flex items-center w-full">
        {hasPrevPage ? <PaginationArrow direction="left" onClick={onPrevPage} /> : null}
        <div className="flex-1 min-w-0">
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
              <>
                {loading ? (
                  <div key="loading" className="center shrink-0">
                    <Icon icon="line-md:loading-loop" size={16} />
                  </div>
                ) : query ? (
                  <button
                    key="clear"
                    type="button"
                    className="center text-error shrink-0 cursor-pointer"
                    onClick={onClear}
                  >
                    <Icon icon="material-symbols:close-rounded" size={16} />
                  </button>
                ) : null}
              </>
            }
          />
        </div>
        {hasNextPage ? <PaginationArrow direction="right" onClick={onNextPage} /> : null}
      </div>

      {shouldShowTabs ? (
        <motion.div
          className="mt-2 overflow-hidden"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
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
                  whileTap={{ scale: NAV_TAP_SCALE }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
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
