'use client';

import AccountBioSurface from '@/features/navigation/surfaces/account-bio-surface';
import { EMPTY_ACCOUNT_REGISTRY_AUTH, buildAccountPageState } from '@/features/account/registry-config';
import { useRegistry } from '@/core/modules/registry';
import { useAccountSectionState } from '../shared/section-context';

const ACCOUNT_REVIEWS_REGISTRY_SOURCE = 'account-reviews';

export default function Registry({ isPageLoading: isPageLoadingProp }) {
  const sectionState = useAccountSectionState();
  const isPageLoading = isPageLoadingProp ?? sectionState.isPageLoading;

  const {
    auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
    followState = 'follow',
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isBioSurfaceOpen = false,
    isFollowLoading = false,
    isOwner = false,
    isResolvingProfile = false,
    itemRemoveConfirmation = null,
    pendingFollowRequestCount = 0,
    profile = null,
    resolveError = null,
    setIsBioSurfaceOpen,
    unfollowConfirmation = null,
    username,
  } = sectionState;

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
      navDescription: 'Reviews',
      navSurface:
        isBioSurfaceOpen && profile?.description ? (
          <AccountBioSurface
            title={profile?.displayName || 'About'}
            description={profile.description}
            onClose={() => setIsBioSurfaceOpen(false)}
          />
        ) : undefined,
      navRegistrySource: ACCOUNT_REVIEWS_REGISTRY_SOURCE,
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
