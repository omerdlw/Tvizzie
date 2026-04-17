import AccountListDetailFeed from '@/features/account/feeds/list-detail';
import { noopAccountRegistryHandler } from '@/features/account/registry-config';
import { useRegistry } from '@/core/modules/registry';
import { buildAccountRegistryState } from '../../../shared/registry-state';

const ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE = 'account-list-detail';

export function Registry({
  auth,
  followState = 'follow',
  handleDeleteList = noopAccountRegistryHandler,
  handleEditList = noopAccountRegistryHandler,
  handleEditProfile = noopAccountRegistryHandler,
  handleFollow = noopAccountRegistryHandler,
  handleOpenFollowList = noopAccountRegistryHandler,
  handleSignInRequest = noopAccountRegistryHandler,
  handleToggleLike = noopAccountRegistryHandler,
  isBioSurfaceOpen = false,
  isFollowLoading = false,
  isLiked = false,
  isLikeLoading = false,
  isOwner = false,
  isPageLoading = false,
  isResolvingProfile = false,
  itemRemoveConfirmation = null,
  list,
  listItemsCount = 0,
  listDeleteConfirmation,
  pendingFollowRequestCount = 0,
  profile = null,
  registrySource = ACCOUNT_LIST_DETAIL_REGISTRY_SOURCE,
  resolveError = null,
  reviewState,
  showProfileFollowAction = true,
  setIsBioSurfaceOpen = noopAccountRegistryHandler,
  unfollowConfirmation = null,
  username,
}) {
  const canLikeList = Boolean(list);
  const navCountsDescription = list
    ? `${listItemsCount} items · ${list?.likesCount || 0} likes · ${list?.reviewsCount || 0} reviews`
    : 'List';

  useRegistry(
    buildAccountRegistryState(
      {
        auth,
        followState,
        handleEditProfile,
        handleFollow,
        handleOpenFollowList,
        handleSignInRequest,
        isBioSurfaceOpen,
        isFollowLoading,
        isOwner,
        isPageLoading,
        isResolvingProfile,
        itemRemoveConfirmation,
        pendingFollowRequestCount,
        profile,
        resolveError,
        setIsBioSurfaceOpen,
        unfollowConfirmation,
        username,
      },
      {
        listDeleteConfirmation,
        navDescription: navCountsDescription,
        navRegistrySource: registrySource,
        isLiked: canLikeList ? isLiked : false,
        isLikeLoading: canLikeList ? isLikeLoading : false,
        onDeleteList: () => handleDeleteList(list),
        onEditList: () => handleEditList(list),
        onToggleLike: canLikeList ? handleToggleLike : null,
        reviewState,
        showProfileFollowAction,
      }
    )
  );

  return null;
}

export default function ListView({ model = null }) {
  return <AccountListDetailFeed model={model} RegistryComponent={Registry} />;
}
