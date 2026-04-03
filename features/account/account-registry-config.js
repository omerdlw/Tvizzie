'use client'

import FollowListModal from '@/features/modal/follow-list-modal'
import AccountSocialModal from '@/features/modal/account-social-modal'
import ListEditorModal from '@/features/modal/list-editor-modal'
import ListPickerModal from '@/features/modal/list-picker-modal'
import ReviewEditorModal from '@/features/modal/review-editor-modal'
import AccountAction from '@/features/navigation/actions/account-action'
import ReviewAction from '@/features/navigation/actions/review-action'
import Icon from '@/ui/icon'
import { getUserAvatarUrl } from '@/core/utils'

const ACCOUNT_LOADING_NAV_PRIORITY = 190
const ACCOUNT_LOADING_NAV_CLEANUP_DELAY_MS = 8000

export const EMPTY_ACCOUNT_REGISTRY_AUTH = Object.freeze({
  isAuthenticated: false,
})

export function noopAccountRegistryHandler() {}

function buildAccountLoadingState({ isLoading = false, navRegistrySource }) {
  return {
    isLoading,
    registry: navRegistrySource
      ? {
          source: navRegistrySource,
        }
      : undefined,
  }
}

export function buildAccountEditState({
  activeTab,
  authIsAuthenticated,
  avatarPreview,
  deleteConfirmation,
  handleSignIn,
  handleSave,
  isGeneralAccountDirty,
  isLoading = false,
  isSaving,
  navRegistrySource,
  setActiveTab,
}) {
  const loadingState = buildAccountLoadingState({
    isLoading,
    navRegistrySource,
  })

  return {
    modal: {
      FOLLOW_LIST_MODAL: FollowListModal,
    },
    loading: loadingState,
    nav: {
      confirmation: deleteConfirmation,
      title: authIsAuthenticated ? 'Edit Account' : 'Account',
      icon: avatarPreview,
      description: isLoading
        ? null
        : authIsAuthenticated
          ? activeTab === 'general'
            ? 'Update your public account details'
            : 'Manage account security and providers'
          : 'Sign in to see your account',
      registry: navRegistrySource
        ? {
            priority: ACCOUNT_LOADING_NAV_PRIORITY,
            source: navRegistrySource,
          }
        : undefined,
      action: !authIsAuthenticated ? (
        <AccountAction isAuthenticated={false} onSignIn={handleSignIn} />
      ) : (
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
          onEditTabChange={setActiveTab}
          onSave={handleSave}
          isSaveLoading={isSaving}
          saveLabel="Save"
          showSaveAction={activeTab === 'general' && isGeneralAccountDirty}
        />
      ),
    },
  }
}

export function buildAccountPageState({
  authIsAuthenticated,
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
  unfollowConfirmation,
  username,
  onDeleteList,
  onEditList,
  onToggleLike,
  isLiked,
  isLikeLoading,
  reviewState,
}) {
  const accountTitle = String(profile?.displayName || '').trim() || 'Account'
  const showSectionSaveAction =
    isSectionEditing &&
    isSectionOrderDirty &&
    typeof onSaveSectionOrder === 'function'
  const canManageRequests = Boolean(isOwner && profile?.isPrivate === true)
  const isPrivateProfile = Boolean(profile?.isPrivate)
  const isFollowingProfile = followState === 'following'
  const shouldForceProfileFollowAction =
    !isOwner && isPrivateProfile && !isFollowingProfile
  const shouldShowProfileFollowAction =
    Boolean(showProfileFollowAction || shouldForceProfileFollowAction)
  const shouldUseNavActionOverride =
    !shouldForceProfileFollowAction && Boolean(navActionOverride)

  const accountNavActions = []

  if (authIsAuthenticated && profile) {
    if (isOwner) {
      if (typeof handleEditProfile === 'function') {
        accountNavActions.push({
          key: 'edit-profile',
          icon: 'solar:pen-bold',
          tooltip: 'Edit Profile',
          order: 25,
          onClick: (event) => {
            event.stopPropagation()
            handleEditProfile()
          },
        })
      }
    }
  }

  const loadingState = buildAccountLoadingState({
    isLoading: isPageLoading,
    navRegistrySource,
  })

  return {
    modal: {
      LIST_EDITOR_MODAL: ListEditorModal,
      LIST_PICKER_MODAL: ListPickerModal,
      FOLLOW_LIST_MODAL: FollowListModal,
      ACCOUNT_SOCIAL_MODAL: AccountSocialModal,
      REVIEW_EDITOR_MODAL: ReviewEditorModal,
    },
    loading: loadingState,
    nav: {
      actions: accountNavActions,
      confirmation:
        itemRemoveConfirmation || listDeleteConfirmation || unfollowConfirmation,
      description: navDescription,
      icon: getUserAvatarUrl(profile),
      registry: navRegistrySource
        ? {
            cleanupDelayMs: isPageLoading
              ? ACCOUNT_LOADING_NAV_CLEANUP_DELAY_MS
              : 0,
            priority: ACCOUNT_LOADING_NAV_PRIORITY,
            source: navRegistrySource,
          }
        : undefined,
      surface: navSurface,
      title: profile?.isPrivate ? (
        <span key="title-icon" className="flex min-w-0 items-center gap-0.5">
          <span key="title" className="truncate">{accountTitle}</span>
          <Icon key="icon" icon="solar:lock-keyhole-bold" className="mb-0.5" size={14} />
        </span>
      ) : accountTitle,
      action: navSurface
        ? null
        : shouldUseNavActionOverride
          ? navActionOverride
          : showSectionSaveAction ? (
              <AccountAction
                mode="save"
                onSave={onSaveSectionOrder}
                isSaveLoading={isSectionSaveLoading}
              />
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
                  showProfileFollowAction={shouldShowProfileFollowAction}
                  onDeleteList={onDeleteList}
                  onEditList={onEditList}
                  onToggleLike={onToggleLike}
                  isLiked={isLiked}
                  isLikeLoading={isLikeLoading}
                  isNotFound={
                    !profile &&
                    !isResolvingProfile &&
                    (Boolean(username) || Boolean(resolveError))
                  }
                />
              ),
    },
  }
}
