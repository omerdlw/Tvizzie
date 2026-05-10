'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import Icon from '@/ui/icon';
import ListCardPreviewStack from './list-card-preview';
import { BACK_PANEL_HEIGHT, STACK_SIZE, buildPreviewSlots, formatListDate, getListHref } from './list-card-utils';

export default function AccountListCard({ list, ownerUsername = null, renderActions = null }) {
  const posterPreferenceVersion = usePosterPreferenceVersion();

  const previewItems = useMemo(
    () => (Array.isArray(list?.previewItems) ? list.previewItems.slice(0, STACK_SIZE) : []),
    [list?.previewItems, posterPreferenceVersion]
  );
  const previewSlots = useMemo(() => buildPreviewSlots(previewItems), [previewItems]);
  const listTitle = String(list?.title || '').trim() || 'Untitled List';
  const updatedLabel = formatListDate(list?.updatedAt || list?.createdAt);
  const itemsCount = Number.isFinite(Number(list?.itemsCount))
    ? Number(list.itemsCount)
    : Array.isArray(list?.previewItems)
      ? list.previewItems.length
      : 0;
  const likesCount = Number.isFinite(Number(list?.likesCount))
    ? Number(list.likesCount)
    : Array.isArray(list?.likes)
      ? list.likes.length
      : 0;
  const reviewsCount = Number.isFinite(Number(list?.reviewsCount)) ? Number(list.reviewsCount) : 0;

  return (
    <article className="relative w-full">
      <Link href={getListHref(list, ownerUsername)} className="tvz-soft-hover-card block">
        <div
          className="relative w-full"
          style={{
            perspective: '1200px',
          }}
        >
          <div
            data-soft-hover="media"
            className="relative z-0 border border-white/10 bg-black"
            style={{
              height: `${BACK_PANEL_HEIGHT}px`,
              transformOrigin: 'center bottom',
              transformStyle: 'preserve-3d',
            }}
          >
            <ListCardPreviewStack previewSlots={previewSlots} />
          </div>

          <div
            className="absolute right-0 bottom-0 left-0 z-10 overflow-hidden border border-white/10 bg-black/80"
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              transformOrigin: 'center bottom',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="relative px-4 py-4">
              <h3 className="line-clamp-2 min-h-[2.6rem] text-[19px] leading-[1.22] font-semibold text-white">
                {listTitle}
              </h3>
            </div>

            <div className="relative h-11 border-t border-white/10">
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[13px] text-white/70">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Icon icon="solar:calendar-mark-bold" size={14} />
                  <span>{updatedLabel}</span>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="solar:list-broken" size={14} />
                      <span>{itemsCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="solar:heart-bold" size={14} />
                      <span>{likesCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="solar:chat-round-bold" size={14} />
                      <span>{reviewsCount}</span>
                    </span>
                  </div>
                  {typeof renderActions === 'function' ? (
                    <div
                      className="shrink-0"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      {renderActions(list)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
