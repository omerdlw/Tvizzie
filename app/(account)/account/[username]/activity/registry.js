'use client';

import AccountAction from '@/features/navigation/actions/account-action';
import AccountBioSurface from '@/features/navigation/surfaces/account-bio-surface';
import {
  EMPTY_ACCOUNT_REGISTRY_AUTH,
  buildAccountPageState,
  noopAccountRegistryHandler,
} from '@/features/account/registry-config';
import { useRegistry } from '@/core/modules/registry';

const ACCOUNT_ACTIVITY_REGISTRY_SOURCE = 'account-activity';

export default function Registry({
  activeScope = 'user',
  auth = EMPTY_ACCOUNT_REGISTRY_AUTH,
  canShowActivity = false,
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
  onScopeChange = noopAccountRegistryHandler,
  pendingFollowRequestCount = 0,
  profile = null,
  registrySource = ACCOUNT_ACTIVITY_REGISTRY_SOURCE,
  resolveError = null,
  setIsBioSurfaceOpen = noopAccountRegistryHandler,
  unfollowConfirmation = null,
  username,
}) {
  const scopeTabs = [
    {
      key: 'user',
      label: profile?.username || username || 'User',
    },
    {
      key: 'following',
      label: 'Following',
    },
  ];

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
      navActionOverride: canShowActivity ? (
        <AccountAction mode="tab-switch" activeTab={activeScope} tabs={scopeTabs} onTabChange={onScopeChange} />
      ) : null,
      navDescription: 'Activity Feed',
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
      unfollowConfirmation,
      username,
    })
  );

  return null;
}
