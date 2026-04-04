'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { filterCollectionItems, showAccountErrorToast } from '@/features/account/account-hook-utils';
import { useAccountSectionPage } from '@/features/account/section-client-hooks';
import { getMediaTitle } from '@/features/account/utils';
import { logDataError } from '@/core/utils/errors';
import { useAuth } from '@/core/modules/auth';
import { useToast } from '@/core/modules/notification/hooks';
import { removeUserWatchedItem, subscribeToUserWatched } from '@/core/services/media/watched.service';
import WatchedView from './view';

export default function Client({
  currentPage = 1,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  username,
}) {
  const auth = useAuth();
  const toast = useToast();
  const {
    canViewProfileCollections,
    followerCount,
    followingCount,
    followState,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isBioSurfaceOpen,
    isFollowLoading,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isResolvingProfile,
    likeCount,
    listCount,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    watchlistCount,
  } = useAccountSectionPage({
    activeTab: 'watched',
    auth,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
  const hasInitialWatchedSnapshot =
    Boolean(initialCollections?.userId && resolvedUserId) &&
    initialCollections.userId === resolvedUserId &&
    Array.isArray(initialCollections?.watched);
  const initialWatched = useMemo(
    () => (hasInitialWatchedSnapshot ? initialCollections.watched : []),
    [hasInitialWatchedSnapshot, initialCollections]
  );
  const [itemRemoveConfirmation, setItemRemoveConfirmation] = useState(null);
  const [isWatchedLoading, setIsWatchedLoading] = useState(!hasInitialWatchedSnapshot);
  const [loadError, setLoadError] = useState(null);
  const [watchedItems, setWatchedItems] = useState(initialWatched);
  const shouldForceWatchedRefresh = !isOwner && isPrivateProfile === true;

  useEffect(() => {
    if (!resolvedUserId || !canViewProfileCollections) {
      setWatchedItems([]);
      setLoadError(null);
      setIsWatchedLoading(false);
      return undefined;
    }

    setWatchedItems(shouldForceWatchedRefresh ? [] : initialWatched);
    setLoadError(null);
    setIsWatchedLoading(shouldForceWatchedRefresh || !hasInitialWatchedSnapshot);

    return subscribeToUserWatched(
      resolvedUserId,
      (nextItems) => {
        setWatchedItems(nextItems);
        setLoadError(null);
        setIsWatchedLoading(false);
      },
      {
        emitCachedPayloadOnSubscribe: !shouldForceWatchedRefresh,
        fetchOnSubscribe: true,
        refreshOnSubscribe: shouldForceWatchedRefresh,
        onError: (error) => {
          setIsWatchedLoading(false);
          logDataError('[Account] Watched could not be loaded:', error);
          setLoadError('Watched could not be loaded right now.');
          showAccountErrorToast(toast, error, 'Watched could not be loaded');
        },
      }
    );
  }, [
    canViewProfileCollections,
    hasInitialWatchedSnapshot,
    initialWatched,
    isPrivateProfile,
    isOwner,
    resolvedUserId,
    shouldForceWatchedRefresh,
    toast,
  ]);

  const handleRemoveWatchedItem = useCallback(
    async (item) => {
      if (!isOwner || !auth.user?.id) {
        return;
      }

      let previousItems = null;

      setWatchedItems((currentItems) => {
        previousItems = currentItems;
        return filterCollectionItems(currentItems, item);
      });

      try {
        await removeUserWatchedItem({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
        toast.success(`${getMediaTitle(item)} was removed from watched`);
      } catch (error) {
        if (previousItems) {
          setWatchedItems(previousItems);
        }

        toast.error(error?.message || 'The item could not be removed');
        throw error;
      }
    },
    [auth.user?.id, isOwner, toast]
  );

  const handleRequestRemoveWatchedItem = useCallback(
    (item) => {
      if (!isOwner) {
        return;
      }

      setItemRemoveConfirmation({
        title: 'Remove Watched Item?',
        description: `${getMediaTitle(item)} will be removed from your watched films.`,
        confirmText: 'Remove',
        confirmLoadingText: 'Removing',
        isDestructive: true,
        onCancel: () => setItemRemoveConfirmation(null),
        onConfirm: () => handleRemoveWatchedItem(item),
      });
    },
    [handleRemoveWatchedItem, isOwner]
  );

  return (
    <WatchedView
      auth={auth}
      canShowWatchedGrid={canViewProfileCollections}
      currentPage={currentPage}
      followerCount={followerCount}
      followingCount={followingCount}
      followState={followState}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleRequestRemoveWatchedItem={handleRequestRemoveWatchedItem}
      handleSignInRequest={handleSignInRequest}
      isBioSurfaceOpen={isBioSurfaceOpen}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading || (canViewProfileCollections && isWatchedLoading && watchedItems.length === 0)}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      likeCount={likeCount}
      listCount={listCount}
      loadError={loadError}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      resolvedUserId={resolvedUserId}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
      watchedItems={watchedItems}
      watchlistCount={watchlistCount}
    />
  );
}
