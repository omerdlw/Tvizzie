'use client';

import AccountListDetailFeed from '@/features/account/feeds/list-detail';
import { createAccountSectionRegistry } from '@/features/account/route/section-factory';

const ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE = 'account-list-detail';

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountListDetailRegistry',
  navDescription: (_, { list, listItemsCount = 0 }) =>
    list ? `${listItemsCount} items · ${list?.likesCount || 0} likes · ${list?.reviewsCount || 0} reviews` : null,
  navRegistrySource: ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE,
  resolveOverrides: (
    _sectionState,
    {
      handleDeleteList,
      handleEditList,
      handleToggleLike,
      isLiked = false,
      isLikeLoading = false,
      itemRemoveConfirmation = null,
      list,
      listDeleteConfirmation,
      registrySource = ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE,
      reviewState,
      showProfileFollowAction = true,
    }
  ) => {
    const canLikeList = Boolean(list);

    return {
      listDeleteConfirmation: itemRemoveConfirmation || listDeleteConfirmation,
      navRegistrySource: registrySource,
      isLiked: canLikeList ? isLiked : false,
      isLikeLoading: canLikeList ? isLikeLoading : false,
      onDeleteList: list ? () => handleDeleteList(list) : null,
      onEditList: list ? () => handleEditList(list) : null,
      onToggleLike: list ? handleToggleLike : null,
      reviewState,
      showProfileFollowAction: Boolean(list) && showProfileFollowAction,
      showToolbarFollowActionWithOverride: Boolean(list),
    };
  },
});

export default function ListView({ model = null }) {
  return <AccountListDetailFeed model={model} RegistryComponent={Registry} />;
}
