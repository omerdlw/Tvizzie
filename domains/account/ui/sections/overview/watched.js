'use client';

import AccountMediaOverviewSection from './media-overview-section';

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
  return (
    <AccountMediaOverviewSection
      baseDelay={baseDelay}
      cardLimit={6}
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
      titleHref={titleHref || (username ? `/account/${username}/watched` : null)}
      wideGrid={true}
      imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
    />
  );
}
