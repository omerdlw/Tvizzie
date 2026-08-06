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

const LIMITS = { activity: 5, media: 6, favorites: 5, lists: 3 };

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
    isOwner = false,
    isPageLoading = false,
    isPrivateProfile = false,
    isViewerReady = false,
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
      {!canViewProfileCollections ? (
        <AccountSectionState message="This profile is private." />
      ) : (
        <>
          {favoriteShowcase.length > 0 && (() => {
            const index = sectionCounter++;
            const isInitial = index === 0;
            const baseDelay = isInitial
              ? TIMELINES.FIRST_SECTION_BASE_DELAY + 0.06
              : undefined;
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

          {watched.length > 0 && (() => {
            const index = sectionCounter++;
            const isInitial = index === 0;
            const baseDelay = isInitial
              ? TIMELINES.FIRST_SECTION_BASE_DELAY + 0.06
              : undefined;
            return (
              <AccountWatchedOverview
                key="section-watched"
                baseDelay={baseDelay}
                emptyMessage="No watched titles yet"
                icon="solar:eye-bold"
                isInitialSection={isInitial}
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

          {watchlist.length > 0 && (() => {
            const index = sectionCounter++;
            const isInitial = index === 0;
            const baseDelay = isInitial
              ? TIMELINES.FIRST_SECTION_BASE_DELAY + 0.06
              : undefined;
            return (
              <AccountWatchlistOverview
                key="section-watchlist"
                baseDelay={baseDelay}
                icon="solar:bookmark-bold"
                isInitialSection={isInitial}
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

          {(() => {
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

          {lists.length > 0 && (() => {
            const index = sectionCounter++;
            const isInitial = index === 0;
            return (
              <AccountListsOverview
                key="section-lists"
                icon="solar:list-broken"
                isInitialSection={isInitial}
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

          {authoredReviews.length > 0 && (() => {
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
    </AccountPageShell>
  );
}
