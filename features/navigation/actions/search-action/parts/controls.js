'use client';

import { useState } from 'react';

import { cn } from '@/core/utils';
import { Input } from '@/ui/elements';
import Icon from '@/ui/icon';

import { SEARCH_STYLES, SEARCH_TAB_ITEMS } from '@/features/search/constants';
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
          input: 'w-full text-sm placeholder:text-white/50 outline-none',
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
            className={`${query ? 'text-white' : 'text-white/50'} transition-colors duration-[300ms]`}
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
          <>
            {loading ? (
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
            ) : null}
          </>
        }
      />

      {shouldShowTabs ? (
        <div className="mt-2 overflow-hidden">
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
        </div>
      ) : null}
    </>
  );
}
