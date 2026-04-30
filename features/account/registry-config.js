'use client';

import { cloneElement, isValidElement } from 'react';

import AccountSocialModal from '@/features/modals/account-social-modal';
import CreateListModal from '@/features/modals/create-list-modal';
import ListEditorModal from '@/features/modals/list-editor-modal';
import ListPickerModal from '@/features/modals/list-picker-modal';
import ReviewEditorModal from '@/features/modals/review-editor-modal';
import AccountAction from '@/features/navigation/actions/account-action';
import ReviewAction from '@/features/navigation/actions/review-action';
import Icon from '@/ui/icon';
import { getUserAvatarUrl } from '@/core/utils';
import { Spinner } from '@/ui/loadings/spinner';

const ACCOUNT_LOADING_NAV_PRIORITY = 190;
const ACCOUNT_LOADING_NAV_CLEANUP_DELAY_MS = 8000;
const PROFILE_FOLLOW_NAV_ACTIONS = Object.freeze({
  follow: {
    icon: 'solar:user-plus-bold',
    label: 'Follow',
  },
  follow_back: {
    icon: 'solar:user-plus-bold',
    label: 'Follow Back',
  },
  following: {
    icon: 'solar:user-minus-bold',
    label: 'Unfollow',
  },
  requested: {
    icon: 'solar:clock-circle-bold',
    label: 'Requested',
  },
});
const PROFILE_FOLLOW_NAV_ACTION_ORDER = -5;

export const EMPTY_ACCOUNT_REGISTRY_AUTH = Object.freeze({
  isAuthenticated: false,
});

export function noopAccountRegistryHandler() {}

function getProfileFollowNavAction(state) {
  const normalizedState = String(state || '')
    .trim()
    .toLowerCase();

  return PROFILE_FOLLOW_NAV_ACTIONS[normalizedState] || PROFILE_FOLLOW_NAV_ACTIONS.follow;
}

function suppressNavOverrideProfileFollowAction(navActionOverride) {
  if (!isValidElement(navActionOverride) || navActionOverride.type !== AccountAction) {
    return navActionOverride;
  }

  return cloneElement(navActionOverride, {
    showProfileFollowAction: false,
  });
}

function hasRouteSpecificAccountAction({ isOwner, navActionOverride, onDeleteList, onEditList, onToggleLike }) {
  return Boolean(
    navActionOverride ||
      (!isOwner && typeof onToggleLike === 'function') ||
      (isOwner && typeof onEditList === 'function' && typeof onDeleteList === 'function')
  );
}

function buildAccountLoadingState({ isLoading = false, navRegistrySource }) {
  return {
    isLoading,
    showOverlay: false,
    registry: navRegistrySource
      ? {
          source: navRegistrySource,
        }
      : undefined,
  };
}

export function buildAccountEditState({
  activeTab,
  authIsAuthenticated,
  avatarPreview,
  deleteConfirmation,
  handleCancel,
  handleSignIn,
  handleSave,
  isGeneralAccountDirty,
  isLoading = false,
  isMediaUploading = false,
  mediaUploadFileName = '',
  isSaving,
  navRegistrySource,
  setActiveTab,
}) {
  const loadingState = buildAccountLoadingState({
    isLoading,
    navRegistrySource,
  });
  const editNavAction = !authIsAuthenticated ? (
    <AccountAction isAuthenticated={false} onSignIn={handleSignIn} />
  ) : isMediaUploading ? null : (
    <AccountAction
      mode="profile-edit"
      activeEditTab={activeTab}
      editTabs={[
        {
          key: 'general',
          icon: 'solar:user-circle-bold',
          label: 'General Info',
        },
        {
          key: 'security',
          icon: 'solar:shield-keyhole-bold',
          label: 'Security',
        },
      ]}
      onCancel={handleCancel}
      onEditTabChange={setActiveTab}
      onSave={handleSave}
      isCancelDisabled={isSaving || isMediaUploading}
      showCancelAction={activeTab === 'general' && isGeneralAccountDirty}
      isSaveDisabled={isMediaUploading}
      isSaveLoading={isSaving}
      saveLabel="Save"
      showSaveAction={activeTab === 'general' && isGeneralAccountDirty}
    />
  );

  return {
    loading: loadingState,
    nav: {
      actions: authIsAuthenticated && !isMediaUploading
        ? [
            {
              key: 'back-to-account',
              icon: 'solar:alt-arrow-left-bold',
              tooltip: 'Back to Account',
              order: -10,
              onClick: (event) => {
                event.stopPropagation();
                window.location.assign('/account');
              },
            },
          ]
        : [],
      confirmation: deleteConfirmation,
      title: authIsAuthenticated ? (isMediaUploading ? 'Media uploading' : 'Edit Account') : 'Account',
      icon: isMediaUploading ? <Spinner size={22} /> : avatarPreview,
      description: isLoading
        ? null
        : authIsAuthenticated
          ? isMediaUploading
            ? mediaUploadFileName || 'Uploading from device'
            : activeTab === 'general'
            ? 'Update your public account details'
            : 'Manage account security and providers'
          : 'Sign in to see your account',
      registry: navRegistrySource
        ? {
            priority: ACCOUNT_LOADING_NAV_PRIORITY,
            source: navRegistrySource,
          }
        : undefined,
      action: editNavAction,
    },
  };
}

export function buildAccountPageState({
  authIsAuthenticated,
  authUser,
  extraNavActions = [],
  followState,
  handleEditProfile,
  handleFollow,
  handleOpenFollowList,
  handleSignInRequest,
  isFollowLoading,
  isOwner,
  isPageLoading,
  isResolvingProfile,
  isSectionEditing,
  isSectionOrderDirty,
  isSectionSaveLoading,
  itemRemoveConfirmation,
  listDeleteConfirmation,
  navDescription,
  navActionOverride,
  navSurface,
  navRegistrySource,
  onSaveSectionOrder,
  pendingFollowRequestCount,
  profile,
  resolveError,
  showProfileFollowAction = false,
  showToolbarFollowActionWithOverride = true,
  unfollowConfirmation,
  username,
  onDeleteList,
  onEditList,
  onToggleLike,
  isLiked,
  isLikeLoading,
  reviewState,
}) {
  const accountTitle = String(profile?.displayName || '').trim() || 'Account';
  const showSectionSaveAction = isSectionEditing && isSectionOrderDirty && typeof onSaveSectionOrder === 'function';
  const canManageRequests = Boolean(isOwner && profile?.isPrivate === true);
  const isPrivateProfile = Boolean(profile?.isPrivate);
  const isFollowingProfile = followState === 'following';
  const hasNavActionOverride = Boolean(navActionOverride);
  const hasRouteAccountAction = hasRouteSpecificAccountAction({
    isOwner,
    navActionOverride,
    onDeleteList,
    onEditList,
    onToggleLike,
  });
  const shouldForceProfileFollowAction = !hasRouteAccountAction && !isOwner && isPrivateProfile && !isFollowingProfile;
  const shouldUseGuestFollowAction =
    !authIsAuthenticated && !isOwner && Boolean(profile) && typeof handleFollow === 'function' && !hasRouteAccountAction;
  const shouldShowInlineProfileFollowAction = Boolean(
    !hasRouteAccountAction && (showProfileFollowAction || shouldForceProfileFollowAction || shouldUseGuestFollowAction)
  );
  const shouldShowToolbarFollowAction = Boolean(
    showToolbarFollowActionWithOverride &&
      hasRouteAccountAction &&
      !isOwner &&
      profile &&
      typeof handleFollow === 'function'
  );
  const shouldShowCurrentAccountAvatar = Boolean(authIsAuthenticated && authUser && profile && !isOwner);
  const shouldUseNavActionOverride = hasNavActionOverride;
  const resolvedNavActionOverride = hasNavActionOverride
    ? suppressNavOverrideProfileFollowAction(navActionOverride)
    : navActionOverride;

  const accountNavActions = [];

  if (profile && isOwner && authIsAuthenticated && typeof handleEditProfile === 'function') {
    accountNavActions.push({
      key: 'edit-profile',
      icon: 'solar:pen-bold',
      tooltip: 'Edit Profile',
      order: 25,
      onClick: (event) => {
        event.stopPropagation();
        handleEditProfile();
      },
    });
  }

  if (shouldShowToolbarFollowAction) {
    const followNavAction = getProfileFollowNavAction(followState);

    accountNavActions.push({
      key: 'profile-follow',
      icon: isFollowLoading ? 'svg-spinners:90-ring-with-bg' : followNavAction.icon,
      tooltip: followNavAction.label,
      order: PROFILE_FOLLOW_NAV_ACTION_ORDER,
      onClick: (event) => {
        event.stopPropagation();

        if (isFollowLoading) {
          return;
        }

        handleFollow();
      },
    });
  }

  if (Array.isArray(extraNavActions) && extraNavActions.length > 0) {
    accountNavActions.push(...extraNavActions.filter(Boolean));
  }

  const loadingState = buildAccountLoadingState({
    isLoading: isPageLoading,
    navRegistrySource,
  });

  return {
    modal: {
      CREATE_LIST_MODAL: CreateListModal,
      LIST_EDITOR_MODAL: ListEditorModal,
      LIST_PICKER_MODAL: ListPickerModal,
      ACCOUNT_SOCIAL_MODAL: AccountSocialModal,
      REVIEW_EDITOR_MODAL: ReviewEditorModal,
    },
    loading: loadingState,
    nav: {
      path: '/account',
      actions: accountNavActions,
      confirmation: itemRemoveConfirmation || listDeleteConfirmation || unfollowConfirmation,
      description: navDescription,
      icon: getUserAvatarUrl(profile),
      iconOverlay: shouldShowCurrentAccountAvatar
        ? {
            icon: getUserAvatarUrl(authUser),
            onClick: () => {
              window.location.assign('/account');
            },
            title: 'Go to your account',
          }
        : null,
      registry: navRegistrySource
        ? {
            cleanupDelayMs: isPageLoading ? ACCOUNT_LOADING_NAV_CLEANUP_DELAY_MS : 0,
            priority: ACCOUNT_LOADING_NAV_PRIORITY,
            source: navRegistrySource,
          }
        : undefined,
      surface: navSurface,
      title: profile?.isPrivate ? (
        <span key="title-icon" className="flex min-w-0 items-center gap-0.5">
          <span key="title" className="truncate">
            {accountTitle}
          </span>
          <Icon key="icon" icon="solar:lock-keyhole-bold" className="mb-0.5" size={14} />
        </span>
      ) : (
        accountTitle
      ),
      action: navSurface ? null : shouldUseNavActionOverride ? (
        resolvedNavActionOverride
      ) : showSectionSaveAction ? (
        <AccountAction mode="save" onSave={onSaveSectionOrder} isSaveLoading={isSectionSaveLoading} />
      ) : reviewState?.isActive ? (
        <ReviewAction reviewState={reviewState} />
      ) : (
        <AccountAction
          isOwner={isOwner}
          isAuthenticated={authIsAuthenticated}
          canManageRequests={canManageRequests}
          followState={followState}
          guestMode="sign-up"
          inboxCount={pendingFollowRequestCount}
          isFollowLoading={isFollowLoading}
          onOpenInbox={() => handleOpenFollowList('requests')}
          onFollow={handleFollow}
          onSignIn={handleSignInRequest}
          onEditProfile={handleEditProfile}
          showProfileFollowAction={shouldShowInlineProfileFollowAction}
          onDeleteList={onDeleteList}
          onEditList={onEditList}
          onToggleLike={onToggleLike}
          isLiked={isLiked}
          isLikeLoading={isLikeLoading}
          isNotFound={!profile && !isResolvingProfile && (Boolean(username) || Boolean(resolveError))}
        />
      ),
    },
  };
}
