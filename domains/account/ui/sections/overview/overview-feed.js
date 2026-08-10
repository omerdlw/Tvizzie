'use client';

import AccountActivityOverview from '@/domains/account/ui/sections/overview/activity';
import AccountFavoritesOverview from '@/domains/account/ui/sections/overview/favorites';
import AccountListsOverview from '@/domains/account/ui/sections/overview/lists';
import AccountReviewsOverview from '@/domains/account/ui/sections/overview/reviews';
import AccountWatchedOverview from '@/domains/account/ui/sections/overview/watched';
import AccountWatchlistOverview from '@/domains/account/ui/sections/overview/watchlist';
import { AccountPageShell } from '@/domains/account/ui/layouts/account-layout';
import { ProfileMediaActions } from '@/domains/account/ui/components/account-media-grid';
import { AccountSectionState } from '@/domains/account/ui/sections/account-section';
import { TIMELINES } from '@/app/(account)/motion';

const LIMITS = { activity: 6, media: 6, favorites: 5, lists: 6 };

export default function AccountOverviewFeed({ model = {}, RegistryComponent = null }) {
  const {
    auth = { isAuthenticated: false, isReady: false, user: null },
    authoredReviews = [],
    authoredReviewsError,
    authoredReviewsLoading,
    canViewPrivateContent = false,
    canViewProfileCollections = false,
    favoriteShowcase = [],
    followerCount = 0,
    followingCount = 0,
    followState,
    handleDeleteReview,
    handleEditReview,
    handleFollow,
    handleLikeReview,
    handleOpenFollowList,
    handleDeleteList,
    handleEditList,
    handleRequestRemoveLike,
    handleRequestRemoveWatchedItem,
    handleRequestRemoveWatchlistItem,
    hasMoreAuthoredReviews,
    initialActivityFeed = null,
    isFollowLoading = false,
    isListsLoading = false,
    isOwner = false,
    isPageLoading = false,
    isPrivateProfile = false,
    isLikesLoading = false,
    isViewerReady = false,
    isWatchedLoading = false,
    isWatchlistLoading = false,
    likeCount = 0,
    likes = [],
    listCount = 0,
    lists = [],
    profile,
    profileHandle,
    resolvedUserId,
    username,
    watched = [],
    watchedCount = 0,
    watchlist = [],
    watchlistCount = 0,
  } = model;

  const currentUserId = auth.user?.id || null;
  const buildHref = (suffix) => (profileHandle ? `/account/${profileHandle}${suffix}` : null);

  const hasFavorites = Array.isArray(favoriteShowcase) && favoriteShowcase.length > 0;
  const hasLikes = likeCount > 0 || (Array.isArray(likes) && likes.length > 0);
  const hasWatched = watchedCount > 0 || (Array.isArray(watched) && watched.length > 0);
  const hasWatchlist = watchlistCount > 0 || (Array.isArray(watchlist) && watchlist.length > 0);
  const hasLists = listCount > 0 || (Array.isArray(lists) && lists.length > 0);
  const initialActivityItems = Array.isArray(initialActivityFeed?.items)
    ? initialActivityFeed.items
    : [];
  const hasActivity =
    initialActivityItems.length > 0 || Number(initialActivityFeed?.totalCount || 0) > 0;
  const shouldRenderActivity = hasActivity || Boolean(resolvedUserId && canViewProfileCollections);
  const hasReviews = Array.isArray(authoredReviews) && authoredReviews.length > 0;

  const isOverviewEmpty =
    !isLikesLoading &&
    !isWatchedLoading &&
    !isWatchlistLoading &&
    !isListsLoading &&
    !authoredReviewsLoading &&
    !hasFavorites &&
    !hasLikes &&
    !hasWatched &&
    !hasWatchlist &&
    !hasLists &&
    !shouldRenderActivity &&
    !hasReviews;

  let sectionCounter = 0;

  return (
    <AccountPageShell
      activeSection="overview"
      followerCount={followerCount}
      followState={followState}
      followingCount={followingCount}
      isLoading={isPageLoading || (!username && auth.isReady && !auth.isAuthenticated)}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      likesCount={likeCount}
      listsCount={listCount}
      onFollow={handleFollow}
      onOpenFollowList={handleOpenFollowList}
      profile={profile}
      registry={RegistryComponent ? <RegistryComponent /> : null}
      resolvedUserId={resolvedUserId}
      skeletonVariant="overview"
      username={profileHandle}
      watchedCount={watchedCount}
      watchlistCount={watchlistCount}
    >
      <div className="w-full">
        {!canViewProfileCollections ? (
          <AccountSectionState message="This profile is private." />
        ) : isOverviewEmpty ? (
          <AccountSectionState message="This account has no activity or content yet." />
        ) : (
          <>
            {hasFavorites &&
              (() => {
                const index = sectionCounter++;
                const isInitial = index === 0;
                const baseDelay = isInitial ? TIMELINES.FIRST_SECTION_BASE_DELAY + 0.06 : undefined;
                return (
                  <AccountFavoritesOverview
                    key="section-favorites"
                    baseDelay={baseDelay}
                    icon="solar:star-bold"
                    isInitialSection={isInitial}
                    isOwner={isOwner}
                    items={favoriteShowcase.slice(0, LIMITS.favorites)}
                    revealDelay={index}
                    title="Favorites"
                    titleHref={buildHref('/likes')}
                    renderOverlay={(item) =>
                      isOwner ? (
                        <ProfileMediaActions
                          media={item}
                          onRemoveItem={handleRequestRemoveLike}
                          removeLabel={`Remove ${item.title || item.name} from favorites`}
                          userId={currentUserId}
                        />
                      ) : null
                    }
                  />
                );
              })()}

            {(hasWatchlist || isWatchlistLoading) &&
              (() => {
                const index = sectionCounter++;
                const isInitial = index === 0;
                const baseDelay = isInitial ? TIMELINES.FIRST_SECTION_BASE_DELAY + 0.06 : undefined;
                return (
                  <AccountWatchlistOverview
                    key="section-watchlist"
                    baseDelay={baseDelay}
                    icon="solar:bookmark-bold"
                    isInitialSection={isInitial}
                    isLoading={isWatchlistLoading}
                    isOwner={isOwner}
                    items={watchlist.slice(0, LIMITS.media)}
                    onRemoveItem={handleRequestRemoveWatchlistItem}
                    revealDelay={index}
                    showSeeMore={watchlistCount > LIMITS.media}
                    title="Watchlist"
                    titleHref={buildHref('/watchlist')}
                    renderOverlay={(item) =>
                      isOwner ? (
                        <ProfileMediaActions
                          media={item}
                          onRemoveItem={handleRequestRemoveWatchlistItem}
                          removeLabel={`Remove ${item.title || item.name} from watchlist`}
                          userId={currentUserId}
                        />
                      ) : null
                    }
                  />
                );
              })()}

            {(hasWatched || isWatchedLoading) &&
              (() => {
                const index = sectionCounter++;
                const isInitial = index === 0;
                const baseDelay = isInitial ? TIMELINES.FIRST_SECTION_BASE_DELAY + 0.06 : undefined;
                return (
                  <AccountWatchedOverview
                    key="section-watched"
                    baseDelay={baseDelay}
                    emptyMessage="No watched titles yet"
                    icon="solar:eye-bold"
                    isInitialSection={isInitial}
                    isLoading={isWatchedLoading}
                    items={watched.slice(0, LIMITS.media)}
                    revealDelay={index}
                    showSeeMore={watchedCount > LIMITS.media}
                    title="Watched"
                    titleHref={buildHref('/watched')}
                    renderOverlay={(item) =>
                      isOwner ? (
                        <ProfileMediaActions
                          media={item}
                          onRemoveItem={handleRequestRemoveWatchedItem}
                          removeLabel={`Remove ${item.title || item.name} from watched`}
                          userId={currentUserId}
                        />
                      ) : null
                    }
                  />
                );
              })()}

            {(hasLikes || isLikesLoading) &&
              (() => {
                const index = sectionCounter++;
                const isInitial = index === 0;
                const baseDelay = isInitial ? TIMELINES.FIRST_SECTION_BASE_DELAY + 0.06 : undefined;
                return (
                  <AccountFavoritesOverview
                    key="section-likes"
                    baseDelay={baseDelay}
                    cardLimit={LIMITS.media}
                    emptyMessage="No liked titles yet"
                    icon="solar:heart-bold"
                    isInitialSection={isInitial}
                    isLoading={isLikesLoading}
                    isOwner={isOwner}
                    items={likes.slice(0, LIMITS.media)}
                    revealDelay={index}
                    showSeeMore={likeCount > LIMITS.media}
                    title="Likes"
                    titleHref={buildHref('/likes')}
                    wideGrid
                    renderOverlay={(item) =>
                      isOwner ? (
                        <ProfileMediaActions
                          media={item}
                          onRemoveItem={handleRequestRemoveLike}
                          removeLabel={`Remove ${item.title || item.name} from likes`}
                          userId={currentUserId}
                        />
                      ) : null
                    }
                  />
                );
              })()}

            {(hasLists || isListsLoading) &&
              (() => {
                const index = sectionCounter++;
                const isInitial = index === 0;
                return (
                  <AccountListsOverview
                    key="section-lists"
                    icon="solar:list-broken"
                    isInitialSection={isInitial}
                    isLoading={isListsLoading}
                    items={lists.slice(0, LIMITS.lists)}
                    isOwner={isOwner}
                    onDeleteList={handleDeleteList}
                    onEditList={handleEditList}
                    ownerUsername={profileHandle}
                    revealDelay={index}
                    showSeeMore={listCount > LIMITS.lists}
                    title="Lists"
                    titleHref={buildHref('/lists')}
                  />
                );
              })()}

            {shouldRenderActivity &&
              (() => {
                const index = sectionCounter++;
                const isInitial = index === 0;
                return (
                  <AccountActivityOverview
                    key="section-activity"
                    canViewPrivateContent={canViewPrivateContent}
                    icon="solar:bolt-bold"
                    initialFeed={initialActivityFeed}
                    isInitialSection={isInitial}
                    isOwner={isOwner}
                    isPrivateProfile={isPrivateProfile}
                    isViewerReady={isViewerReady}
                    limit={LIMITS.activity}
                    revealDelay={index}
                    resolvedUserId={resolvedUserId}
                    summaryLabel=""
                    title="Recent Activity"
                    titleHref={buildHref('/activity')}
                  />
                );
              })()}

            {(hasReviews || authoredReviewsLoading) &&
              (() => {
                const index = sectionCounter++;
                const isInitial = index === 0;
                return (
                  <AccountReviewsOverview
                    key="section-reviews"
                    currentUserId={currentUserId}
                    icon="solar:chat-round-bold"
                    isInitialSection={isInitial}
                    isLoading={authoredReviewsLoading}
                    items={authoredReviews}
                    likes={likes}
                    loadError={authoredReviewsError}
                    onDeleteRequest={handleDeleteReview}
                    onEdit={handleEditReview}
                    onLike={handleLikeReview}
                    revealDelay={index}
                    showOwnActions={isOwner}
                    showSeeMore={hasMoreAuthoredReviews}
                    summaryLabel=""
                    title="Recent Reviews"
                    titleHref={buildHref('/reviews')}
                  />
                );
              })()}
          </>
        )}
      </div>
    </AccountPageShell>
  );
}
