'use client';

import { cloneElement, isValidElement } from 'react';

import AccountSocialModal from '@/features/modals/account-social-modal';
import CreateListModal from '@/features/modals/create-list-modal';
import ListEditorModal from '@/features/modals/list-editor-modal';
import ListPickerModal from '@/features/modals/list-picker-modal';
import ReviewEditorModal from '@/features/modals/review-editor-modal';
import AccountAction from '@/features/navigation/actions/account-action';
import ReviewAction from '@/features/navigation/actions/review-action';
import { getUserAvatarUrl } from '@/core/utils';
import Icon from '@/ui/icon';
import {
  ACCOUNT_LOADING_NAV_CLEANUP_DELAY_MS,
  ACCOUNT_LOADING_NAV_PRIORITY,
  buildAccountLoadingState,
} from './common';

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
    !authIsAuthenticated &&
    !isOwner &&
    Boolean(profile) &&
    typeof handleFollow === 'function' &&
    !hasRouteAccountAction;
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
