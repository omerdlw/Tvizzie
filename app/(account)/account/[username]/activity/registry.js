'use client';

import AccountAction from '@/features/navigation/actions/account-action';
import AccountBioSurface from '@/features/navigation/surfaces/account-bio-surface';
import { EMPTY_ACCOUNT_REGISTRY_AUTH, buildAccountPageState } from '@/features/account/registry-config';
import { useRegistry } from '@/core/modules/registry';
import { useAccountSectionState } from '../shared/section-context';

const ACCOUNT_ACTIVITY_REGISTRY_SOURCE = 'account-activity';

export default function Registry({
  activeScope = 'user',
  isPageLoading: isPageLoadingProp,
  onScopeChange = () => {},
}) {
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
      navActionOverride: (
        <AccountAction
          mode="tab-switch"
          activeTab={activeScope}
          tabs={scopeTabs}
          onTabChange={onScopeChange}
          followState={followState}
          isFollowLoading={isFollowLoading}
          isOwner={isOwner}
          onFollow={handleFollow}
          showProfileFollowAction
        />
      ),
      navDescription: 'Activity Feed',
      navSurface:
        isBioSurfaceOpen && profile?.description ? (
          <AccountBioSurface
            title={profile?.displayName || 'About'}
            description={profile.description}
            onClose={() => setIsBioSurfaceOpen(false)}
          />
        ) : undefined,
      navRegistrySource: ACCOUNT_ACTIVITY_REGISTRY_SOURCE,
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
