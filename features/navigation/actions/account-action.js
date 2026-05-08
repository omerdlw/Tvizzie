'use client';

import { useEffect } from 'react';

import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref, getCurrentPathWithSearch } from '@/features/auth/utils';
import { usePathname, useSearchParams } from 'next/navigation';
import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/core/constants';
import Icon from '@/ui/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import { useNavigationActions } from '@/core/modules/nav/context';
import { INFO_ACTION_TONE_CLASS, SUCCESS_ACTION_TONE_CLASS, WARNING_ACTION_TONE_CLASS } from '@/core/constants/index';

const PROFILE_FOLLOW_ACTIONS = Object.freeze({
  follow: {
    icon: 'solar:user-plus-bold',
    label: 'Follow',
    tone: 'muted',
  },
  follow_back: {
    icon: 'solar:user-plus-bold',
    label: 'Follow Back',
    tone: 'muted',
  },
  following: {
    icon: 'solar:user-minus-bold',
    label: 'Unfollow',
    tone: 'active',
  },
  requested: {
    icon: 'solar:clock-circle-bold',
    label: 'Requested',
    tone: 'info',
  },
});

function actionClass({ tone = 'muted', className } = {}) {
  return getNavActionClass({
    variant:
      tone === 'danger'
        ? DESTRUCTIVE_ACTION_TONE_CLASS
        : tone === 'success'
          ? SUCCESS_ACTION_TONE_CLASS
          : tone === 'info'
            ? INFO_ACTION_TONE_CLASS
            : tone === 'warning'
              ? WARNING_ACTION_TONE_CLASS
              : tone === 'active'
                ? NAV_ACTION_STYLES.active
                : NAV_ACTION_STYLES.muted,
    className,
  });
}

function getProfileFollowAction(state) {
  return PROFILE_FOLLOW_ACTIONS[state] || PROFILE_FOLLOW_ACTIONS.follow;
}

function AccountActionButton({ children, className = '', disabled = false, onClick, tone = 'muted' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={actionClass({ tone, className })}>
      {children}
    </button>
  );
}

function IconLabel({ icon, children }) {
  return (
    <>
      <Icon icon={icon} size={NAV_ACTION_STYLES.icon} />
      {children}
    </>
  );
}

function NavTabButton({ active, children, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={actionClass({
        tone: active ? 'active' : 'muted',
        className: 'justify-center',
      })}
    >
      {icon ? <Icon icon={icon} size={NAV_ACTION_STYLES.icon} /> : null}
      {children}
    </button>
  );
}

export default function AccountAction(props) {
  const {
    mode,
    activeEditTab,
    editTabs = [],
    activeTab,
    tabs = [],
    actionIcon,
    actionLabel,
    actionTone = 'muted',
    followState = 'follow',
    guestMode = 'sign-in',
    isOwner,
    isAuthenticated,
    isFollowLoading = false,
    inboxCount,
    canManageRequests = false,
    onFollow,
    onOpenInbox,
    onEditTabChange,
    onTabChange,
    onSignIn,
    showProfileFollowAction = false,
    isNotFound,
    onOpenMediaUpload,
    onCancel,
    onSave,
    isCancelDisabled = false,
    cancelLabel = 'Cancel',
    isUploadDisabled = false,
    isSaveDisabled = false,
    saveLabel = 'Save',
    isSaveLoading,
    showCancelAction = false,
    showSaveAction = false,
    showUploadAction = false,
    uploadLabel = 'Upload Media',
    // List actions
    isLiked,
    isLikeLoading,
    onDeleteList,
    onEditList,
    onAction,
    onToggleLike,
  } = props;
  const { setCompactLock } = useNavigationActions();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = getCurrentPathWithSearch(pathname, searchParams);
  const guestHref = buildAuthHref(guestMode === 'sign-up' ? AUTH_ROUTES.SIGN_UP : AUTH_ROUTES.SIGN_IN, {
    next: currentPath,
  });
  const guestLabel = guestMode === 'sign-up' ? 'Sign Up' : 'Sign In';
  const guestIcon = guestMode === 'sign-up' ? 'solar:user-plus-bold' : 'solar:user-circle-bold';

  useEffect(() => {
    const shouldLockCompact = mode === 'profile-edit' && showSaveAction;
    setCompactLock('account-action', shouldLockCompact);

    return () => {
      setCompactLock('account-action', false);
    };
  }, [mode, setCompactLock, showSaveAction]);

  if (mode === 'tab-switch') {
    if (!tabs.length) {
      return null;
    }

    const canShowFollowAction = !isOwner && showProfileFollowAction && typeof onFollow === 'function';
    const followAction = canShowFollowAction ? getProfileFollowAction(followState) : null;

    return (
      <div className="mt-2.5 flex w-full flex-col gap-2">
        <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => (
            <NavTabButton key={tab.key} active={activeTab === tab.key} onClick={() => onTabChange?.(tab.key)}>
              {tab.label}
            </NavTabButton>
          ))}
        </div>

        {canShowFollowAction ? (
          <div className="flex w-full gap-2">
            <AccountActionButton onClick={onFollow} disabled={isFollowLoading} tone={followAction.tone}>
              {isFollowLoading ? 'Updating' : <IconLabel icon={followAction.icon}>{followAction.label}</IconLabel>}
            </AccountActionButton>
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'profile-edit') {
    const canShowUploadAction = showUploadAction && typeof onOpenMediaUpload === 'function';
    const canShowCancelAction = showCancelAction && typeof onCancel === 'function';
    const shouldShowTabRow = !showSaveAction;
    const shouldShowBottomRow = canShowUploadAction || canShowCancelAction || showSaveAction;

    return (
      <div className="mt-2.5 flex w-full flex-col gap-2">
        {shouldShowTabRow ? (
          <div className="grid w-full grid-cols-2 gap-2">
            {editTabs.map((tab) => (
              <NavTabButton
                key={tab.key}
                active={activeEditTab === tab.key}
                icon={tab.icon}
                onClick={() => onEditTabChange?.(tab.key)}
              >
                {tab.label}
              </NavTabButton>
            ))}
          </div>
        ) : null}

        {shouldShowBottomRow ? (
          <div className="flex w-full gap-2">
            {canShowUploadAction ? (
              <AccountActionButton
                onClick={onOpenMediaUpload}
                disabled={isUploadDisabled}
                tone="info"
                className={showSaveAction ? 'flex-1' : ''}
              >
                <IconLabel icon="solar:upload-bold">{uploadLabel}</IconLabel>
              </AccountActionButton>
            ) : null}

            {canShowCancelAction ? (
              <AccountActionButton onClick={onCancel} disabled={isCancelDisabled} className="flex-1">
                <IconLabel icon="material-symbols:close-rounded">{cancelLabel}</IconLabel>
              </AccountActionButton>
            ) : null}

            {showSaveAction ? (
              <AccountActionButton
                onClick={onSave}
                disabled={isSaveLoading || isSaveDisabled}
                tone={isSaveDisabled ? 'muted' : 'success'}
                className={canShowUploadAction || canShowCancelAction ? 'flex-1' : ''}
              >
                {isSaveLoading ? 'Saving' : <IconLabel icon="material-symbols:check-rounded">{saveLabel}</IconLabel>}
              </AccountActionButton>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'save') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <AccountActionButton
          onClick={onSave}
          disabled={isSaveLoading || isSaveDisabled}
          tone={isSaveDisabled ? 'muted' : 'success'}
        >
          {isSaveLoading ? 'Saving' : <IconLabel icon="material-symbols:check-rounded">{saveLabel}</IconLabel>}
        </AccountActionButton>
      </div>
    );
  }

  if (mode === 'single-action') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <AccountActionButton onClick={onAction} tone={actionTone}>
          {actionIcon ? <IconLabel icon={actionIcon}>{actionLabel}</IconLabel> : actionLabel}
        </AccountActionButton>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <AccountActionButton onClick={() => (window.location.href = '/')}>Back Home</AccountActionButton>
      </div>
    );
  }

  const canShowFollowAction = !isOwner && showProfileFollowAction && typeof onFollow === 'function';
  const canShowLikeListAction = !isOwner && typeof onToggleLike === 'function';

  if (canShowFollowAction || canShowLikeListAction) {
    const followAction = canShowFollowAction ? getProfileFollowAction(followState) : null;

    return (
      <div className={NAV_ACTION_STYLES.row}>
        {canShowFollowAction ? (
          <AccountActionButton onClick={onFollow} disabled={isFollowLoading} tone={followAction.tone}>
            {isFollowLoading ? 'Updating' : <IconLabel icon={followAction.icon}>{followAction.label}</IconLabel>}
          </AccountActionButton>
        ) : null}

        {canShowLikeListAction ? (
          <AccountActionButton onClick={onToggleLike} disabled={isLikeLoading} tone={isLiked ? 'success' : 'muted'}>
            {isLikeLoading ? (
              'Updating'
            ) : (
              <IconLabel icon={isLiked ? 'solar:heart-bold' : 'solar:heart-linear'}>
                {isLiked ? 'Liked' : 'Like List'}
              </IconLabel>
            )}
          </AccountActionButton>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <AccountActionButton
          onClick={() => {
            if (guestMode === 'sign-in' && typeof onSignIn === 'function') {
              onSignIn();
              return;
            }

            window.location.assign(guestHref);
          }}
        >
          <IconLabel icon={guestIcon}>{guestLabel}</IconLabel>
        </AccountActionButton>
      </div>
    );
  }

  if (isOwner) {
    const showListActions = typeof onEditList === 'function' && typeof onDeleteList === 'function';
    const shouldShowInboxAction = canManageRequests && inboxCount > 0 && typeof onOpenInbox === 'function';

    if (!showListActions && !shouldShowInboxAction) {
      return null;
    }

    return (
      <div className={NAV_ACTION_STYLES.row}>
        {showListActions ? (
          <>
            <AccountActionButton onClick={() => onEditList?.()}>
              <IconLabel icon="solar:pen-bold">Edit List</IconLabel>
            </AccountActionButton>
            <AccountActionButton onClick={() => onDeleteList?.()} tone="danger">
              <IconLabel icon="solar:trash-bin-trash-bold">Delete List</IconLabel>
            </AccountActionButton>
          </>
        ) : shouldShowInboxAction ? (
          <AccountActionButton onClick={onOpenInbox} tone="info">
            <IconLabel icon="solar:inbox-bold">Inbox {inboxCount}</IconLabel>
          </AccountActionButton>
        ) : null}
      </div>
    );
  }

  return null;
}
