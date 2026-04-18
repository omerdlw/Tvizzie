'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { mergeCollectionItemsWithExistingMetadata } from '@/features/account/hooks/collections';
import { getMediaTitle, notifyAccountLoadError, removeAccountCollectionItem } from '@/features/account/utils';
import { logDataError } from '@/core/utils/errors';
import { useToast } from '@/core/modules/notification/hooks';
import { removeUserWatchedItem, subscribeToUserWatched } from '@/core/services/media/watched.service';
import { createAccountSectionClient } from '../../shared/section-factory';
import WatchedView from './view';

function useWatchedClientState({ auth, routeData: resolvedRouteData, sectionProviderValue, sectionState }) {
  const toast = useToast();
  const { canViewProfileCollections, isOwner, isPrivateProfile, resolvedUserId, isPageLoading } = sectionState;
  const hasInitialWatchedSnapshot =
    Boolean(resolvedRouteData.initialCollections?.userId && resolvedUserId) &&
    resolvedRouteData.initialCollections.userId === resolvedUserId &&
    Array.isArray(resolvedRouteData.initialCollections?.watched);
  const initialWatched = useMemo(
    () => (hasInitialWatchedSnapshot ? resolvedRouteData.initialCollections.watched : []),
    [hasInitialWatchedSnapshot, resolvedRouteData.initialCollections]
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
        setWatchedItems((currentItems) => mergeCollectionItemsWithExistingMetadata(currentItems, nextItems));
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
          notifyAccountLoadError(toast, error, 'Watched could not be loaded');
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
        return removeAccountCollectionItem(currentItems, item);
      });

      try {
        await removeUserWatchedItem({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
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

  return {
    providerValue: {
      ...sectionProviderValue,
      isPageLoading: isPageLoading || (canViewProfileCollections && isWatchedLoading && watchedItems.length === 0),
      itemRemoveConfirmation,
    },
    handleRequestRemoveWatchedItem,
    loadError,
    watchedItems,
  };
}

export default createAccountSectionClient({
  activeTab: 'watched',
  displayName: 'AccountWatchedClient',
  View: WatchedView,
  useSectionClientState: useWatchedClientState,
});
