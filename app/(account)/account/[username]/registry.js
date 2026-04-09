'use client';

import AccountBioSurface from '@/features/navigation/surfaces/account-bio-surface';
import {
  EMPTY_ACCOUNT_REGISTRY_AUTH,
  buildAccountPageState,
  noopAccountRegistryHandler,
} from '@/features/account/registry-config';
import { useRegistry } from '@/core/modules/registry';

const ACCOUNT_PROFILE_OVERVIEW_REGISTRY_SOURCE = 'account-profile-overview';

export default function Registry({
  auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
  followState = 'follow',
  handleEditProfile = noopAccountRegistryHandler,
  handleFollow = noopAccountRegistryHandler,
  handleOpenFollowList = noopAccountRegistryHandler,
  handleSignInRequest = noopAccountRegistryHandler,
  isBioSurfaceOpen = false,
  isFollowLoading = false,
  isOwner = false,
  isPageLoading = false,
  isResolvingProfile = false,
  itemRemoveConfirmation = null,
  navDescription,
  pendingFollowRequestCount = 0,
  profile = null,
  registrySource = ACCOUNT_PROFILE_OVERVIEW_REGISTRY_SOURCE,
  resolveError = null,
  setIsBioSurfaceOpen = noopAccountRegistryHandler,
  unfollowConfirmation = null,
  username,
}) {
  useRegistry(
    buildAccountPageState({
      authIsAuthenticated: auth.isAuthenticated,
      followState,
      handleEditProfile,
      handleFollow,
      handleOpenFollowList,
      handleSignInRequest,
      isFollowLoading,
      isOwner,
      isPageLoading,
      isResolvingProfile,
      isSectionEditing: false,
      isSectionOrderDirty: false,
      isSectionSaveLoading: false,
      itemRemoveConfirmation,
      listDeleteConfirmation: null,
      navDescription,
      navSurface:
        isBioSurfaceOpen && profile?.description ? (
          <AccountBioSurface
            title={profile?.displayName || 'About'}
            description={profile.description}
            onClose={() => setIsBioSurfaceOpen(false)}
          />
        ) : undefined,
      navRegistrySource: registrySource,
      onSaveSectionOrder: null,
      pendingFollowRequestCount,
      profile,
      resolveError,
      showProfileFollowAction: true,
      unfollowConfirmation,
      username,
    })
  );

  return null;
}
