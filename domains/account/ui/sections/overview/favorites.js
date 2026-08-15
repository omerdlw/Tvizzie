'use client';

import AccountMediaOverviewSection from './media-overview-section';

export default function AccountFavoritesOverview({
  baseDelay,
  cardLimit = 5,
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
  return (
    <AccountMediaOverviewSection
      baseDelay={baseDelay}
      cardLimit={cardLimit}
      emptyMessage={emptyMessage}
      icon={icon}
      isInitialSection={isInitialSection}
      isLoading={isLoading}
      items={items}
      renderOverlay={renderOverlay}
      revealDelay={revealDelay}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref}
      wideGrid={wideGrid}
      imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
    />
  );
}
