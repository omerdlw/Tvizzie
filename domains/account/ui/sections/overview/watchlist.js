'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import MediaCard from '@/domains/media/ui/components/media-card';
import { usePosterPreferenceVersion } from '@/domains/media/utils/poster-overrides';
import { toAccountMediaCard } from '@/domains/account/utils/media-card';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import {
  AccountInlineSectionState,
  AccountInlineSectionLoading,
} from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
import { getCardProps } from '@/app/(account)/motion';

const OVERVIEW_ROW_CARD_LIMIT = 6;

export default function AccountWatchlistOverview({
  baseDelay,
  emptyMessage = 'Watchlist empty',
  icon = 'solar:bookmark-bold',
  isInitialSection = false,
  isLoading = false,
  isOwner = false,
  items = [],
  onRemoveItem,
  renderOverlay = null,
  revealDelay = 0,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Watchlist',
  titleHref = null,
  username,
}) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const [pendingItemId, setPendingItemId] = useState(null);
  const cards = useMemo(
    () => items.map(toAccountMediaCard).filter(Boolean),
    [items, posterPreferenceVersion],
  );
  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      revealDelay={revealDelay}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref || (username ? `/account/${username}/watchlist` : null)}
    >
      {isLoading && cards.length === 0 ? (
        <AccountInlineSectionLoading message="Loading watchlist..." />
      ) : cards.length > 0 ? (
        <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
          {cards.slice(0, OVERVIEW_ROW_CARD_LIMIT).map((card, index) => {
            const cardProps = getCardProps(index, baseDelay);
            return (
              <motion.div
                key={`${card.id}-${index}`}
                className="flex h-full min-w-0 flex-col"
                initial={cardProps.initial}
                animate={cardProps.animate}
                transition={cardProps.transition}
                whileHover={cardProps.whileHover}
                whileTap={cardProps.whileTap}
              >
                <MediaCard
                  href={card.href}
                  className="w-full md:w-full lg:w-full"
                  imageSrc={card.imageSrc}
                  imageAlt={card.imageAlt}
                  imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                  topOverlay={
                    typeof renderOverlay === 'function' ? (
                      renderOverlay(card.item)
                    ) : isOwner && typeof onRemoveItem === 'function' ? (
                      <div className="absolute inset-x-0 top-0 flex justify-end p-2">
                        <Button
                          variant="destructive-icon"
                          className={
                            'text-error hover:border-error hover:bg-error rounded-xl border border-black/15 bg-white hover:text-white'
                          }
                          aria-label={`Remove ${card.imageAlt} from ${title.toLowerCase()}`}
                          disabled={pendingItemId === card.id}
                          onClick={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (pendingItemId === card.id) {
                              return;
                            }
                            setPendingItemId(card.id);
                            try {
                              await onRemoveItem(card.item);
                            } finally {
                              setPendingItemId((currentId) =>
                                currentId === card.id ? null : currentId,
                              );
                            }
                          }}
                        >
                          <Icon
                            icon="solar:trash-bin-trash-bold"
                            size={16}
                            className={pendingItemId === card.id ? '' : ''}
                          />
                        </Button>
                      </div>
                    ) : null
                  }
                  tooltipText={card.tooltipText}
                />
              </motion.div>
            );
          })}
        </div>
      ) : (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      )}
    </AccountSectionLayout>
  );
}
