'use client';

import { useMemo, useState } from 'react';
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
import { AccountReveal } from '@/app/(account)/motion';
const OVERVIEW_ROW_CARD_LIMIT = 5;
export default function AccountFavoritesOverview({
  baseDelay,
  cardLimit = OVERVIEW_ROW_CARD_LIMIT,
  emptyMessage = 'No favorites showcase yet',
  icon = 'solar:star-bold',
  isInitialSection = true,
  isLoading = false,
  isOwner = false,
  items = [],
  onRemoveItem,
  renderOverlay = null,
  revealDelay = 0,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Favorites Showcase',
  titleHref = null,
  wideGrid = false,
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
      titleHref={titleHref}
    >
      {isLoading && cards.length === 0 ? (
        <AccountInlineSectionLoading />
      ) : cards.length > 0 ? (
        <div
          className={`grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 ${
            wideGrid ? 'lg:grid-cols-6' : ''
          }`}
        >
          {cards.slice(0, cardLimit).map((card, index) => {

            return (
              <AccountReveal
                key={`${card.id}-${index}`}
                className="flex h-full min-w-0 flex-col"
                deferred
                interactive
                itemIndex={index}
                stage="item.media"
              >
                <MediaCard
                  className="w-full md:w-full lg:w-full"
                  href={card.href}
                  imageAlt={card.imageAlt}
                  imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
                  imageSrc={card.imageSrc}
                  topOverlay={
                    typeof renderOverlay === 'function' ? (
                      renderOverlay(card.item)
                    ) : isOwner && typeof onRemoveItem === 'function' ? (
                      <div className="absolute inset-x-0 top-0 flex justify-end p-2">
                        <Button
                          aria-label={`Remove ${card.imageAlt} from favorites showcase`}
                          variant="destructive-icon"
                          className={
                            'text-error hover:border-error hover:bg-error  border border-black/15 bg-white hover:text-white'
                          }
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
                            className={pendingItemId === card.id ? '' : ''}
                            icon="solar:trash-bin-trash-bold"
                            size={16}
                          />
                        </Button>
                      </div>
                    ) : null
                  }
                  tooltipText={card.tooltipText}
                />
              </AccountReveal>
            );
          })}
        </div>
      ) : (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      )}
    </AccountSectionLayout>
  );
}
