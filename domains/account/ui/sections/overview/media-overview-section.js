'use client';

import { useMemo } from 'react';
import MediaCard from '@/ui/components/media-card';
import { usePosterPreferenceVersion } from '@/domains/media/utils/poster-preferences';
import { toAccountMediaCard } from '@/domains/account/utils/media-card';
import {
  AccountInlineSectionState,
  AccountInlineSectionLoading,
} from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';

export default function AccountMediaOverviewSection({
  baseDelay,
  cardLimit = 6,
  emptyMessage,
  icon,
  isInitialSection = false,
  isLoading = false,
  items = [],
  renderOverlay = null,
  revealDelay = 0,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
  wideGrid = false,
  imageSizes = '(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw',
}) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
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
        <AccountInlineSectionLoading wideGrid={wideGrid} />
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {cards.slice(0, cardLimit).map((card, index) => {
            return (
              <div key={`${card.id}-${index}`}>
                <MediaCard
                  href={card.href}
                  imageAlt={card.imageAlt}
                  imageSizes={imageSizes}
                  imageSrc={card.imageSrc}
                  tooltipText={card.tooltipText}
                  topOverlay={
                    typeof renderOverlay === 'function' ? renderOverlay(card.item, card) : null
                  }
                />
              </div>
            );
          })}
        </div>
      ) : (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      )}
    </AccountSectionLayout>
  );
}
