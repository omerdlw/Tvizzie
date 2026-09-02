'use client';

import { motion } from 'motion/react';
import { useEffect } from 'react';
import { getCurrentPathWithSearch } from '@/domains/auth/utils/routes';
import { usePathname, useSearchParams } from 'next/navigation';
import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/shared';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from './constants';
import { useNavigationActions } from '@/modules/nav';
import { createSignInSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-in-surface';
import { createSignUpSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-up-surface';
import {
  INFO_ACTION_TONE_CLASS,
  SUCCESS_ACTION_TONE_CLASS,
  WARNING_ACTION_TONE_CLASS,
} from '@/shared';
import { NAV_BUTTON_TRANSITION, NAV_TAP_SCALE, navListItemVariants } from '@/modules/nav';

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

function FollowActionButton({ action, isLoading = false, onClick }) {
  const isRequested = action?.label === 'Requested';
  const idleLabel = isRequested ? 'Requested' : action.label;
  const hoverLabel = isRequested ? 'Cancel Request' : idleLabel;

  return (
    <motion.div
      variants={navListItemVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <Button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        aria-label={isLoading ? 'Updating follow request' : hoverLabel}
        className={actionClass({
          tone: action.tone,
          className: 'group w-full transition-all duration-300 ease-in-out',
        })}
      >
        <span className="flex items-center gap-2.5">
          <Icon
            icon={isLoading ? 'svg-spinners:90-ring-with-bg' : action.icon}
            size={NAV_ACTION_STYLES.icon}
          />
          {isLoading ? (
            <span>Updating</span>
          ) : (
            <>
              <span className={isRequested ? 'group-hover:hidden' : ''}>{idleLabel}</span>
              {isRequested ? <span className="hidden group-hover:inline">{hoverLabel}</span> : null}
            </>
          )}
        </span>
      </Button>
    </motion.div>
  );
}

function formatDiaryMonth(value) {
  const [year, month] = String(value || '')
    .split('-')
    .map(Number);
  if (!year || !month) return 'Diary';

  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
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
    isNextMonthHidden = false,
    isPreviousMonthHidden = false,
    inboxCount,
    monthKey,
    canManageRequests = false,
    onFollow,
    onOpenInbox,
    onNextMonth,
    onPreviousMonth,
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
    onOpenReviewComposer,
    ownReview,
  } = props;
  const { setCompactLock, openSurface } = useNavigationActions();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = getCurrentPathWithSearch(pathname, searchParams);
  const guestLabel = guestMode === 'sign-up' ? 'Sign Up' : 'Sign In';
  const guestIcon = guestMode === 'sign-up' ? 'solar:user-plus-bold' : 'solar:user-circle-bold';

  const handleGuestAuth = async () => {
    await openSurface(
      guestMode === 'sign-up'
        ? createSignUpSurfaceEntry({ next: currentPath })
        : createSignInSurfaceEntry({ next: currentPath }),
    );
  };

  useEffect(() => {
    const shouldLockCompact = (mode === 'profile-edit' || mode === 'tab-switch') && showSaveAction;
    setCompactLock('account-action', shouldLockCompact);

    return () => {
      setCompactLock('account-action', false);
    };
  }, [mode, setCompactLock, showSaveAction]);

  if (mode === 'diary-month') {
    return (
      <div className="flex w-full items-center gap-2.5">
        {!isPreviousMonthHidden ? (
          <Button
            type="button"
            onClick={onPreviousMonth}
            aria-label="Previous month"
            className="center h-[38px] w-[38px] shrink-0 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset"
          >
            <Icon icon="solar:arrow-left-linear" size={NAV_ACTION_STYLES.icon} />
          </Button>
        ) : null}
        <p className="flex h-[38px] min-w-0 flex-1 items-center justify-center rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-3 text-center text-xs font-semibold text-white/70 uppercase">
          {formatDiaryMonth(monthKey)}
        </p>
        {!isNextMonthHidden ? (
          <Button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="center h-[38px] w-[38px] shrink-0 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset"
          >
            <Icon icon="solar:arrow-right-linear" size={NAV_ACTION_STYLES.icon} />
          </Button>
        ) : null}
      </div>
    );
  }

  if (mode === 'tab-switch') {
    if (!tabs.length) {
      return null;
    }

    const canShowFollowAction =
      !isOwner && showProfileFollowAction && typeof onFollow === 'function';
    const followAction = canShowFollowAction ? getProfileFollowAction(followState) : null;
    const canShowCancelAction = showCancelAction && typeof onCancel === 'function';

    return (
      <div className="flex w-full flex-col gap-2.5">
        {showSaveAction || canShowCancelAction ? (
          <div className="flex w-full gap-2.5">
            {canShowCancelAction ? (
              <Button
                type="button"
                onClick={onCancel}
                disabled={isCancelDisabled}
                className={actionClass({
                  tone: 'muted',
                  className: 'flex-1 justify-center',
                })}
              >
                {cancelLabel}
              </Button>
            ) : null}

            {showSaveAction ? (
              <Button
                type="button"
                onClick={onSave}
                disabled={isSaveLoading || isSaveDisabled}
                className={actionClass({
                  tone: isSaveDisabled ? 'muted' : 'success',
                  className: canShowCancelAction
                    ? 'flex-1 justify-center'
                    : 'w-full justify-center',
                })}
              >
                {isSaveLoading ? (
                  <span key="saving">Saving</span>
                ) : (
                  <span key="save" className="flex items-center gap-2.5">
                    <Icon icon="material-symbols:check-rounded" size={NAV_ACTION_STYLES.icon} />
                    {saveLabel}
                  </span>
                )}
              </Button>
            ) : null}
          </div>
        ) : (
          <div
            className="grid w-full gap-2.5"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <Button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange?.(tab.key)}
                  aria-pressed={isActive}
                  className={actionClass({
                    tone: isActive ? 'active' : 'muted',
                    className: 'relative justify-center overflow-hidden',
                  })}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>
        )}

        {canShowFollowAction && !showSaveAction ? (
          <div className="flex w-full gap-2.5">
            <FollowActionButton
              action={followAction}
              isLoading={isFollowLoading}
              onClick={onFollow}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'profile-edit') {
    const canShowUploadAction = showUploadAction && typeof onOpenMediaUpload === 'function';
    const canShowCancelAction = showCancelAction && typeof onCancel === 'function';
    const shouldShowTabRow = !showSaveAction && editTabs.length > 0;
    const shouldShowBottomRow = canShowUploadAction || canShowCancelAction || showSaveAction;

    return (
      <div className="flex w-full flex-col gap-2.5">
        {shouldShowTabRow ? (
          <div className="grid w-full grid-cols-2 gap-2.5">
            {editTabs.map((tab) => {
              const isActive = activeEditTab === tab.key;

              return (
                <Button
                  key={tab.key}
                  type="button"
                  onClick={() => onEditTabChange?.(tab.key)}
                  aria-pressed={isActive}
                  className={actionClass({
                    tone: isActive ? 'active' : 'muted',
                    className: 'justify-center',
                  })}
                >
                  <Icon icon={tab.icon} size={NAV_ACTION_STYLES.icon} />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        ) : null}

        {shouldShowBottomRow ? (
          <div className="flex w-full gap-2.5">
            {canShowUploadAction ? (
              <Button
                type="button"
                onClick={onOpenMediaUpload}
                disabled={isUploadDisabled}
                className={actionClass({
                  tone: 'info',
                  className: showSaveAction ? 'flex-1' : '',
                })}
              >
                <Icon icon="solar:upload-bold" size={NAV_ACTION_STYLES.icon} />
                {uploadLabel}
              </Button>
            ) : null}

            {canShowCancelAction ? (
              <Button
                type="button"
                onClick={onCancel}
                disabled={isCancelDisabled}
                className={actionClass({
                  tone: 'muted',
                  className: 'flex-1',
                })}
              >
                {cancelLabel}
              </Button>
            ) : null}

            {showSaveAction ? (
              <Button
                type="button"
                onClick={onSave}
                disabled={isSaveLoading || isSaveDisabled}
                className={actionClass({
                  tone: isSaveDisabled ? 'muted' : 'success',
                  className: canShowUploadAction || canShowCancelAction ? 'flex-1' : '',
                })}
              >
                {isSaveLoading ? (
                  <span key="saving">Saving</span>
                ) : (
                  <span key="save" className="flex items-center gap-2.5">
                    <Icon icon="material-symbols:check-rounded" size={NAV_ACTION_STYLES.icon} />
                    {saveLabel}
                  </span>
                )}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'save') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaveLoading || isSaveDisabled}
          className={actionClass({ tone: !isSaveDisabled && 'success', className: '' })}
        >
          {isSaveLoading ? (
            <span key="saving">Saving</span>
          ) : (
            <span key="save" className="flex items-center gap-2.5">
              <Icon icon="material-symbols:check-rounded" size={NAV_ACTION_STYLES.icon} />
              {saveLabel}
            </span>
          )}
        </Button>
      </div>
    );
  }

  if (mode === 'single-action') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <Button type="button" onClick={onAction} className={actionClass({ tone: actionTone })}>
          {actionIcon ? <Icon icon={actionIcon} size={NAV_ACTION_STYLES.icon} /> : null}
          {actionLabel}
        </Button>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <Button
          type="button"
          onClick={() => (window.location.href = '/')}
          className={actionClass()}
        >
          Back Home
        </Button>
      </div>
    );
  }

  const canShowFollowAction = !isOwner && showProfileFollowAction && typeof onFollow === 'function';
  const canShowLikeListAction = !isOwner && typeof onToggleLike === 'function';
  const canShowCommentAction = !isOwner && typeof onOpenReviewComposer === 'function';

  if (canShowFollowAction || canShowLikeListAction || canShowCommentAction) {
    const followAction = canShowFollowAction ? getProfileFollowAction(followState) : null;

    return (
      <div className={NAV_ACTION_STYLES.row}>
        {canShowFollowAction ? (
          <FollowActionButton
            action={followAction}
            isLoading={isFollowLoading}
            onClick={onFollow}
          />
        ) : null}

        {canShowLikeListAction ? (
          <Button
            type="button"
            onClick={onToggleLike}
            className={actionClass({
              tone: isLiked ? 'success' : 'muted',
              className: 'transition-all duration-300 ease-in-out',
            })}
          >
            <span key={isLiked ? 'liked' : 'like'} className="flex items-center gap-2.5">
              <Icon
                icon={isLiked ? 'solar:heart-bold' : 'solar:heart-linear'}
                size={NAV_ACTION_STYLES.icon}
              />
              {isLiked ? 'Liked' : 'Like List'}
            </span>
          </Button>
        ) : null}

        {canShowCommentAction ? (
          <Button
            type="button"
            onClick={onOpenReviewComposer}
            className={actionClass({ tone: 'muted', className: '' })}
          >
            <Icon
              icon={ownReview ? 'solar:pen-bold' : 'solar:chat-round-bold'}
              size={NAV_ACTION_STYLES.icon}
            />
            {ownReview ? 'Edit Comment' : 'Add Comment'}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <Button
          type="button"
          onClick={() => {
            if (guestMode === 'sign-in' && typeof onSignIn === 'function') {
              onSignIn();
              return;
            }

            void handleGuestAuth();
          }}
          className={actionClass()}
        >
          <Icon icon={guestIcon} size={NAV_ACTION_STYLES.icon} />
          {guestLabel}
        </Button>
      </div>
    );
  }

  if (isOwner) {
    const showListActions = typeof onEditList === 'function' && typeof onDeleteList === 'function';
    const shouldShowInboxAction =
      canManageRequests && inboxCount > 0 && typeof onOpenInbox === 'function';

    if (!showListActions && !shouldShowInboxAction && !canShowCommentAction) {
      return null;
    }

    return (
      <div className={NAV_ACTION_STYLES.row}>
        {showListActions ? (
          <>
            <Button type="button" onClick={() => onEditList?.()} className={actionClass()}>
              <Icon icon="solar:pen-bold" size={NAV_ACTION_STYLES.icon} />
              Edit List
            </Button>
            <Button
              type="button"
              onClick={() => onDeleteList?.()}
              className={actionClass({ tone: 'danger' })}
            >
              <Icon icon="solar:trash-bin-trash-bold" size={NAV_ACTION_STYLES.icon} />
              Delete List
            </Button>
          </>
        ) : null}

        {canShowCommentAction ? (
          <Button
            type="button"
            onClick={onOpenReviewComposer}
            className={actionClass({ tone: 'muted', className: '' })}
          >
            <Icon
              icon={ownReview ? 'solar:pen-bold' : 'solar:chat-round-bold'}
              size={NAV_ACTION_STYLES.icon}
            />
            {ownReview ? 'Edit Comment' : 'Add Comment'}
          </Button>
        ) : null}

        {shouldShowInboxAction && (
          <Button type="button" onClick={onOpenInbox} className={actionClass({ tone: 'info' })}>
            <Icon icon="solar:inbox-bold" size={NAV_ACTION_STYLES.icon} />
            Inbox {inboxCount}
          </Button>
        )}
      </div>
    );
  }

  return null;
}
