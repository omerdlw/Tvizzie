'use client';

import { useState } from 'react';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import AccountMediaOverviewSection from './media-overview-section';

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
  const [pendingItemId, setPendingItemId] = useState(null);

  const handleRenderOverlay = (item, card) => {
    if (typeof renderOverlay === 'function') {
      return renderOverlay(item);
    }

    if (isOwner && typeof onRemoveItem === 'function') {
      return (
        <div>
          <Button
            variant="destructive-icon"

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
                await onRemoveItem(item);
              } finally {
                setPendingItemId((currentId) => (currentId === card.id ? null : currentId));
              }
            }}
          >
            <Icon icon="solar:trash-bin-trash-bold" size={16} />
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <AccountMediaOverviewSection
      baseDelay={baseDelay}
      cardLimit={6}
      emptyMessage={emptyMessage}
      icon={icon}
      isInitialSection={isInitialSection}
      isLoading={isLoading}
      items={items}
      renderOverlay={handleRenderOverlay}
      revealDelay={revealDelay}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref || (username ? `/account/${username}/watchlist` : null)}
      wideGrid={true}
      imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
    />
  );
}
