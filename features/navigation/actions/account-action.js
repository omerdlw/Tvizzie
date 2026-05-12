'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref, getCurrentPathWithSearch } from '@/features/auth/auth-flow';
import { usePathname, useSearchParams } from 'next/navigation';
import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/core/constants';
import Icon from '@/ui/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import { useNavigationActions } from '@/core/modules/nav/context';
import { INFO_ACTION_TONE_CLASS, SUCCESS_ACTION_TONE_CLASS, WARNING_ACTION_TONE_CLASS } from '@/core/constants/index';
import {
  FEATURE_NAV_ACTION_BUTTON_MOTION,
  FEATURE_NAV_ACTION_ROW_MOTION,
  getFeatureNavActionItemMotion,
  getFeatureNavSubmittingMotion,
} from '@/features/motion';

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
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={actionClass({ tone, className })}
      {...FEATURE_NAV_ACTION_BUTTON_MOTION}
    >
      {children}
    </motion.button>
  );
}

function AccountActionRow({ children, className = NAV_ACTION_STYLES.row }) {
  return (
    <motion.div className={className} {...FEATURE_NAV_ACTION_ROW_MOTION}>
      {children}
    </motion.div>
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
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={actionClass({
        tone: active ? 'active' : 'muted',
        className: 'justify-center',
      })}
      animate={getFeatureNavSubmittingMotion(false)}
      {...FEATURE_NAV_ACTION_BUTTON_MOTION}
    >
      {icon ? <Icon icon={icon} size={NAV_ACTION_STYLES.icon} /> : null}
      {children}
    </motion.button>
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
      <AccountActionRow className="mt-2.5 flex w-full flex-col gap-2">
        <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab, index) => (
            <motion.div key={tab.key} {...getFeatureNavActionItemMotion(index)}>
              <NavTabButton active={activeTab === tab.key} onClick={() => onTabChange?.(tab.key)}>
                {tab.label}
              </NavTabButton>
            </motion.div>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {canShowFollowAction ? (
            <motion.div className="flex w-full gap-2" {...getFeatureNavActionItemMotion(tabs.length)}>
              <AccountActionButton onClick={onFollow} disabled={isFollowLoading} tone={followAction.tone}>
                {isFollowLoading ? 'Updating' : <IconLabel icon={followAction.icon}>{followAction.label}</IconLabel>}
              </AccountActionButton>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </AccountActionRow>
    );
  }

  if (mode === 'profile-edit') {
    const canShowUploadAction = showUploadAction && typeof onOpenMediaUpload === 'function';
    const canShowCancelAction = showCancelAction && typeof onCancel === 'function';
    const shouldShowTabRow = !showSaveAction;
    const shouldShowBottomRow = canShowUploadAction || canShowCancelAction || showSaveAction;

    return (
      <AccountActionRow className="mt-2.5 flex w-full flex-col gap-2">
        <AnimatePresence initial={false}>
          {shouldShowTabRow ? (
            <motion.div className="grid w-full grid-cols-2 gap-2" {...getFeatureNavActionItemMotion(0)}>
              {editTabs.map((tab, index) => (
                <motion.div key={tab.key} {...getFeatureNavActionItemMotion(index)}>
                  <NavTabButton
                    active={activeEditTab === tab.key}
                    icon={tab.icon}
                    onClick={() => onEditTabChange?.(tab.key)}
                  >
                    {tab.label}
                  </NavTabButton>
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {shouldShowBottomRow ? (
            <motion.div className="flex w-full gap-2" {...getFeatureNavActionItemMotion(1)}>
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
                  {isSaveLoading ? (
                    'Saving'
                  ) : (
                    <IconLabel icon="material-symbols:check-rounded">{saveLabel}</IconLabel>
                  )}
                </AccountActionButton>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </AccountActionRow>
    );
  }

  if (mode === 'save') {
    return (
      <AccountActionRow>
        <AccountActionButton
          onClick={onSave}
          disabled={isSaveLoading || isSaveDisabled}
          tone={isSaveDisabled ? 'muted' : 'success'}
        >
          {isSaveLoading ? 'Saving' : <IconLabel icon="material-symbols:check-rounded">{saveLabel}</IconLabel>}
        </AccountActionButton>
      </AccountActionRow>
    );
  }

  if (mode === 'single-action') {
    return (
      <AccountActionRow>
        <AccountActionButton onClick={onAction} tone={actionTone}>
          {actionIcon ? <IconLabel icon={actionIcon}>{actionLabel}</IconLabel> : actionLabel}
        </AccountActionButton>
      </AccountActionRow>
    );
  }

  if (isNotFound) {
    return (
      <AccountActionRow>
        <AccountActionButton onClick={() => (window.location.href = '/')}>Back Home</AccountActionButton>
      </AccountActionRow>
    );
  }

  const canShowFollowAction = !isOwner && showProfileFollowAction && typeof onFollow === 'function';
  const canShowLikeListAction = !isOwner && typeof onToggleLike === 'function';

  if (canShowFollowAction || canShowLikeListAction) {
    const followAction = canShowFollowAction ? getProfileFollowAction(followState) : null;

    return (
      <AccountActionRow>
        {canShowFollowAction ? (
          <motion.div className="min-w-0 flex-1" {...getFeatureNavActionItemMotion(0)}>
            <AccountActionButton onClick={onFollow} disabled={isFollowLoading} tone={followAction.tone}>
              {isFollowLoading ? 'Updating' : <IconLabel icon={followAction.icon}>{followAction.label}</IconLabel>}
            </AccountActionButton>
          </motion.div>
        ) : null}

        {canShowLikeListAction ? (
          <motion.div className="min-w-0 flex-1" {...getFeatureNavActionItemMotion(1)}>
            <AccountActionButton onClick={onToggleLike} disabled={isLikeLoading} tone={isLiked ? 'success' : 'muted'}>
              {isLikeLoading ? (
                'Updating'
              ) : (
                <IconLabel icon={isLiked ? 'solar:heart-bold' : 'solar:heart-linear'}>
                  {isLiked ? 'Liked' : 'Like List'}
                </IconLabel>
              )}
            </AccountActionButton>
          </motion.div>
        ) : null}
      </AccountActionRow>
    );
  }

  if (!isAuthenticated) {
    return (
      <AccountActionRow>
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
      </AccountActionRow>
    );
  }

  if (isOwner) {
    const showListActions = typeof onEditList === 'function' && typeof onDeleteList === 'function';
    const shouldShowInboxAction = canManageRequests && inboxCount > 0 && typeof onOpenInbox === 'function';

    if (!showListActions && !shouldShowInboxAction) {
      return null;
    }

    return (
      <AccountActionRow>
        {showListActions ? (
          <>
            <motion.div className="min-w-0 flex-1" {...getFeatureNavActionItemMotion(0)}>
              <AccountActionButton onClick={() => onEditList?.()}>
                <IconLabel icon="solar:pen-bold">Edit List</IconLabel>
              </AccountActionButton>
            </motion.div>
            <motion.div className="min-w-0 flex-1" {...getFeatureNavActionItemMotion(1)}>
              <AccountActionButton onClick={() => onDeleteList?.()} tone="danger">
                <IconLabel icon="solar:trash-bin-trash-bold">Delete List</IconLabel>
              </AccountActionButton>
            </motion.div>
          </>
        ) : shouldShowInboxAction ? (
          <AccountActionButton onClick={onOpenInbox} tone="info">
            <IconLabel icon="solar:inbox-bold">Inbox {inboxCount}</IconLabel>
          </AccountActionButton>
        ) : null}
      </AccountActionRow>
    );
  }

  return null;
}
