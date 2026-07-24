'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref, getCurrentPathWithSearch } from '@/features/auth/auth-flow';
import { usePathname, useSearchParams } from 'next/navigation';
import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/core/constants';
import Icon from '@/ui/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/features/navigation/actions/model';
import { useNavigationActions } from '@/core/modules/nav';
import {
  INFO_ACTION_TONE_CLASS,
  SUCCESS_ACTION_TONE_CLASS,
  WARNING_ACTION_TONE_CLASS,
} from '@/core/constants/index';
import {
  NAV_TAP_SCALE,
  NAV_FADE_TRANSITION,
  NAV_SURFACE_TRANSITION,
} from '@/core/modules/nav/motion';

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
  const guestHref = buildAuthHref(
    guestMode === 'sign-up' ? AUTH_ROUTES.SIGN_UP : AUTH_ROUTES.SIGN_IN,
    {
      next: currentPath,
    },
  );
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

    const canShowFollowAction =
      !isOwner && showProfileFollowAction && typeof onFollow === 'function';
    const followAction = canShowFollowAction ? getProfileFollowAction(followState) : null;

    return (
      <div className="mt-2.5 flex w-full flex-col gap-2">
        <div
          className="grid w-full gap-2"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <motion.button
                key={tab.key}
                type="button"
                onClick={() => onTabChange?.(tab.key)}
                aria-pressed={isActive}
                className={actionClass({
                  tone: isActive ? 'active' : 'muted',
                  className: 'justify-center relative overflow-hidden',
                })}
                whileTap={{ scale: NAV_TAP_SCALE }}
                transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
              >
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {canShowFollowAction ? (
          <div className="flex w-full gap-2">
            <motion.button
              type="button"
              onClick={onFollow}
              disabled={isFollowLoading}
              className={actionClass({
                tone: followAction.tone,
                className: '',
              })}
              whileTap={isFollowLoading ? undefined : { scale: NAV_TAP_SCALE }}
              transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
            >
              <AnimatePresence mode="wait">
                {isFollowLoading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={NAV_FADE_TRANSITION}
                  >
                    Updating
                  </motion.span>
                ) : (
                  <motion.span
                    key={followAction.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={NAV_FADE_TRANSITION}
                    className="flex items-center gap-2"
                  >
                    <Icon icon={followAction.icon} size={NAV_ACTION_STYLES.icon} />
                    {followAction.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
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
            {editTabs.map((tab) => {
              const isActive = activeEditTab === tab.key;

              return (
                <motion.button
                  key={tab.key}
                  type="button"
                  onClick={() => onEditTabChange?.(tab.key)}
                  aria-pressed={isActive}
                  className={actionClass({
                    tone: isActive ? 'active' : 'muted',
                    className: 'justify-center',
                  })}
                  whileTap={{ scale: NAV_TAP_SCALE }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
                >
                  <Icon icon={tab.icon} size={NAV_ACTION_STYLES.icon} />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        ) : null}

        {shouldShowBottomRow ? (
          <div className="flex w-full gap-2">
            {canShowUploadAction ? (
              <motion.button
                type="button"
                onClick={onOpenMediaUpload}
                disabled={isUploadDisabled}
                className={actionClass({
                  tone: 'info',
                  className: showSaveAction ? 'flex-1' : '',
                })}
                whileTap={isUploadDisabled ? undefined : { scale: NAV_TAP_SCALE }}
                transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
              >
                <Icon icon="solar:upload-bold" size={NAV_ACTION_STYLES.icon} />
                {uploadLabel}
              </motion.button>
            ) : null}

            {canShowCancelAction ? (
              <motion.button
                type="button"
                onClick={onCancel}
                disabled={isCancelDisabled}
                className={actionClass({
                  tone: 'muted',
                  className: 'flex-1',
                })}
                whileTap={isCancelDisabled ? undefined : { scale: NAV_TAP_SCALE }}
                transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
              >
                <Icon icon="material-symbols:close-rounded" size={NAV_ACTION_STYLES.icon} />
                {cancelLabel}
              </motion.button>
            ) : null}

            {showSaveAction ? (
              <motion.button
                type="button"
                onClick={onSave}
                disabled={isSaveLoading || isSaveDisabled}
                className={actionClass({
                  tone: isSaveDisabled ? 'muted' : 'success',
                  className: canShowUploadAction || canShowCancelAction ? 'flex-1' : '',
                })}
                whileTap={isSaveLoading || isSaveDisabled ? undefined : { scale: NAV_TAP_SCALE }}
                transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
              >
                <AnimatePresence mode="wait">
                  {isSaveLoading ? (
                    <motion.span
                      key="saving"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={NAV_FADE_TRANSITION}
                    >
                      Saving
                    </motion.span>
                  ) : (
                    <motion.span
                      key="save"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={NAV_FADE_TRANSITION}
                      className="flex items-center gap-2"
                    >
                      <Icon icon="material-symbols:check-rounded" size={NAV_ACTION_STYLES.icon} />
                      {saveLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'save') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <motion.button
          type="button"
          onClick={onSave}
          disabled={isSaveLoading || isSaveDisabled}
          className={actionClass({ tone: !isSaveDisabled && 'success', className: '' })}
          whileTap={isSaveLoading || isSaveDisabled ? undefined : { scale: NAV_TAP_SCALE }}
          transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
        >
          <AnimatePresence mode="wait">
            {isSaveLoading ? (
              <motion.span
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={NAV_FADE_TRANSITION}
              >
                Saving
              </motion.span>
            ) : (
              <motion.span
                key="save"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={NAV_FADE_TRANSITION}
                className="flex items-center gap-2"
              >
                <Icon icon="material-symbols:check-rounded" size={NAV_ACTION_STYLES.icon} />
                {saveLabel}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    );
  }

  if (mode === 'single-action') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <motion.button
          type="button"
          onClick={onAction}
          className={actionClass({ tone: actionTone })}
          whileTap={{ scale: NAV_TAP_SCALE }}
          transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
        >
          {actionIcon ? <Icon icon={actionIcon} size={NAV_ACTION_STYLES.icon} /> : null}
          {actionLabel}
        </motion.button>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <motion.button
          type="button"
          onClick={() => (window.location.href = '/')}
          className={actionClass()}
          whileTap={{ scale: NAV_TAP_SCALE }}
          transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
        >
          Back Home
        </motion.button>
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
          <motion.button
            type="button"
            onClick={onFollow}
            disabled={isFollowLoading}
            className={actionClass({
              tone: followAction.tone,
              className: '',
            })}
            whileTap={isFollowLoading ? undefined : { scale: NAV_TAP_SCALE }}
            transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
          >
            <AnimatePresence mode="wait">
              {isFollowLoading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={NAV_FADE_TRANSITION}
                >
                  Updating
                </motion.span>
              ) : (
                <motion.span
                  key={followAction.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={NAV_FADE_TRANSITION}
                  className="flex items-center gap-2"
                >
                  <Icon icon={followAction.icon} size={NAV_ACTION_STYLES.icon} />
                  {followAction.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ) : null}

        {canShowLikeListAction ? (
          <motion.button
            type="button"
            onClick={onToggleLike}
            disabled={isLikeLoading}
            className={actionClass({
              tone: isLiked ? 'success' : 'muted',
              className: '',
            })}
            whileTap={isLikeLoading ? undefined : { scale: NAV_TAP_SCALE }}
            transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
          >
            <AnimatePresence mode="wait">
              {isLikeLoading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={NAV_FADE_TRANSITION}
                >
                  Updating
                </motion.span>
              ) : (
                <motion.span
                  key={isLiked ? 'liked' : 'like'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={NAV_FADE_TRANSITION}
                  className="flex items-center gap-2"
                >
                  <Icon
                    icon={isLiked ? 'solar:heart-bold' : 'solar:heart-linear'}
                    size={NAV_ACTION_STYLES.icon}
                  />
                  {isLiked ? 'Liked' : 'Like List'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <motion.button
          type="button"
          onClick={() => {
            if (guestMode === 'sign-in' && typeof onSignIn === 'function') {
              onSignIn();
              return;
            }

            window.location.assign(guestHref);
          }}
          className={actionClass()}
          whileTap={{ scale: NAV_TAP_SCALE }}
          transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
        >
          <Icon icon={guestIcon} size={NAV_ACTION_STYLES.icon} />
          {guestLabel}
        </motion.button>
      </div>
    );
  }

  if (isOwner) {
    const showListActions = typeof onEditList === 'function' && typeof onDeleteList === 'function';
    const shouldShowInboxAction =
      canManageRequests && inboxCount > 0 && typeof onOpenInbox === 'function';

    if (!showListActions && !shouldShowInboxAction) {
      return null;
    }

    return (
      <div className={NAV_ACTION_STYLES.row}>
        {showListActions ? (
          <>
            <motion.button
              type="button"
              onClick={() => onEditList?.()}
              className={actionClass()}
              whileTap={{ scale: NAV_TAP_SCALE }}
              transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
            >
              <Icon icon="solar:pen-bold" size={NAV_ACTION_STYLES.icon} />
              Edit List
            </motion.button>
            <motion.button
              type="button"
              onClick={() => onDeleteList?.()}
              className={actionClass({ tone: 'danger' })}
              whileTap={{ scale: NAV_TAP_SCALE }}
              transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
            >
              <Icon icon="solar:trash-bin-trash-bold" size={NAV_ACTION_STYLES.icon} />
              Delete List
            </motion.button>
          </>
        ) : (
          <>
            {shouldShowInboxAction && (
              <motion.button
                type="button"
                onClick={onOpenInbox}
                className={actionClass({ tone: 'info' })}
                whileTap={{ scale: NAV_TAP_SCALE }}
                transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.6 }}
              >
                <Icon icon="solar:inbox-bold" size={NAV_ACTION_STYLES.icon} />
                Inbox {inboxCount}
              </motion.button>
            )}
          </>
        )}
      </div>
    );
  }

  return null;
}
