'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

import MediaCard from '@/domains/media/ui/components/media-card';
import { usePosterPreferenceVersion } from '@/domains/media/utils/poster-overrides';
import { toAccountMediaCard } from '@/domains/account/utils/media-card';
import {
  AccountInlineSectionState,
  AccountInlineSectionLoading,
} from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
import { getCardProps } from '@/app/(account)/motion';

const OVERVIEW_ROW_CARD_LIMIT = 6;

export default function AccountWatchedOverview({
  baseDelay,
  emptyMessage = 'No watched titles yet',
  icon = 'solar:eye-bold',
  isInitialSection = false,
  isLoading = false,
  items = [],
  renderOverlay = null,
  revealDelay = 0,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Watched',
  titleHref = null,
  username,
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
      titleHref={titleHref || (username ? `/account/${username}/watched` : null)}
    >
      {isLoading && cards.length === 0 ? (
        <AccountInlineSectionLoading />
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
                  topOverlay={typeof renderOverlay === 'function' ? renderOverlay(card.item) : null}
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
