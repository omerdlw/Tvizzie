'use client';

import Link from 'next/link';

import { cn } from '@/core/utils';
import { ACCOUNT_ROUTE_SHELL_CLASS } from './utils';

const SECTION_ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'likes', label: 'Likes' },
  { key: 'watched', label: 'Watched' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'lists', label: 'Lists' },
];

function getSectionHref(username, key) {
  const basePath = `/account/${username}`;

  switch (key) {
    case 'overview':
      return basePath;
    case 'likes':
      return `${basePath}/likes`;
    case 'activity':
      return `${basePath}/activity`;
    case 'watched':
      return `${basePath}/watched`;
    case 'watchlist':
      return `${basePath}/watchlist`;
    case 'reviews':
      return `${basePath}/reviews`;
    case 'lists':
      return `${basePath}/lists`;
    default:
      return basePath;
  }
}

export default function AccountSectionNav({ activeKey = 'overview', className = '', username = null }) {
  if (!username) {
    return null;
  }

  return (
    <div className={cn('bg-transparent', className)}>
      <div className={cn('', ACCOUNT_ROUTE_SHELL_CLASS)}>
        <div className="flex w-full items-stretch gap-2 overflow-x-auto px-4 py-3 sm:justify-center sm:px-8 sm:py-4">
          {SECTION_ITEMS.map((item) => {
            const isActive = item.key === activeKey;

            return (
              <Link
                key={item.key}
                href={getSectionHref(username, item.key)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center rounded-[12px] border px-4 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase backdrop-blur-sm transition sm:px-4 sm:text-xs',
                  isActive
                    ? 'border border-[#0ea5e9] bg-[#bae6fd] text-[#0c4a6e]'
                    : 'border border-[#0284c7] bg-[#dbeafe] text-black/70'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
