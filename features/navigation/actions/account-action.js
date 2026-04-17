'use client';

import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/features/auth';
import { usePathname, useSearchParams } from 'next/navigation';
import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/core/constants';
import Icon from '@/ui/icon';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/core/modules/nav/actions/styles';
import { INFO_ACTION_TONE_CLASS, SUCCESS_ACTION_TONE_CLASS, WARNING_ACTION_TONE_CLASS } from '@/core/constants/index';

const PROFILE_FOLLOW_ACTIONS = Object.freeze({
  follow: {
    icon: 'solar:user-plus-bold',
    label: 'Follow',
    tone: 'active',
  },
  follow_back: {
    icon: 'solar:user-plus-bold',
    label: 'Follow Back',
    tone: 'active',
  },
  following: {
    icon: 'solar:user-minus-bold',
    label: 'Unfollow',
    tone: 'muted',
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
    onSave,
    isSaveDisabled = false,
    saveLabel = 'Save',
    isSaveLoading,
    showSaveAction = false,
    // List actions
    isLiked,
    isLikeLoading,
    onDeleteList,
    onEditList,
    onAction,
    onToggleLike,
  } = props;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = getCurrentPathWithSearch(pathname, searchParams);
  const guestHref = buildAuthHref(guestMode === 'sign-up' ? AUTH_ROUTES.SIGN_UP : AUTH_ROUTES.SIGN_IN, {
    next: currentPath,
  });
  const guestLabel = guestMode === 'sign-up' ? 'Sign Up' : 'Sign In';
  const guestIcon = guestMode === 'sign-up' ? 'solar:user-plus-bold' : 'solar:user-circle-bold';

  if (mode === 'tab-switch') {
    if (!tabs.length) {
      return null;
    }

    const canShowFollowAction = !isOwner && showProfileFollowAction && typeof onFollow === 'function';
    const followAction = canShowFollowAction ? getProfileFollowAction(followState) : null;

    return (
      <div className="mt-2.5 flex w-full flex-col gap-2">
        <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange?.(tab.key)}
                aria-pressed={isActive}
                className={actionClass({
                  tone: isActive ? 'active' : 'muted',
                  className: 'justify-center',
                })}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {canShowFollowAction ? (
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onFollow}
              disabled={isFollowLoading}
              className={actionClass({
                tone: followAction.tone,
                className: '',
              })}
            >
              {isFollowLoading ? (
                'Updating'
              ) : (
                <>
                  <Icon icon={followAction.icon} size={NAV_ACTION_STYLES.icon} />
                  {followAction.label}
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'profile-edit') {
    return (
      <div className="mt-2.5 flex w-full flex-col gap-2">
        <div className="grid w-full grid-cols-2 gap-2">
          {editTabs.map((tab) => {
            const isActive = activeEditTab === tab.key;

            return (
              <button
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
              </button>
            );
          })}
        </div>

        {showSaveAction ? (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaveLoading}
            className={actionClass({ tone: 'success', className: '' })}
          >
            {isSaveLoading ? (
              'Saving'
            ) : (
              <>
                <Icon icon="solar:check-circle-bold" size={NAV_ACTION_STYLES.icon} />
                {saveLabel}
              </>
            )}
          </button>
        ) : null}
      </div>
    );
  }

  if (mode === 'save') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaveLoading || isSaveDisabled}
          className={actionClass({ tone: !isSaveDisabled && 'success', className: '' })}
        >
          {isSaveLoading ? (
            'Saving'
          ) : (
            <>
              <Icon icon="solar:check-circle-bold" size={NAV_ACTION_STYLES.icon} />
              {saveLabel}
            </>
          )}
        </button>
      </div>
    );
  }

  if (mode === 'single-action') {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <button type="button" onClick={onAction} className={actionClass({ tone: actionTone })}>
          {actionIcon ? <Icon icon={actionIcon} size={NAV_ACTION_STYLES.icon} /> : null}
          {actionLabel}
        </button>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <button type="button" onClick={() => (window.location.href = '/')} className={actionClass()}>
          Back Home
        </button>
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
          <button
            type="button"
            onClick={onFollow}
            disabled={isFollowLoading}
            className={actionClass({
              tone: followAction.tone,
              className: '',
            })}
          >
            {isFollowLoading ? (
              'Updating'
            ) : (
              <>
                <Icon icon={followAction.icon} size={NAV_ACTION_STYLES.icon} />
                {followAction.label}
              </>
            )}
          </button>
        ) : null}

        {canShowLikeListAction ? (
          <button
            type="button"
            onClick={onToggleLike}
            disabled={isLikeLoading}
            className={actionClass({
              tone: isLiked ? 'success' : 'muted',
              className: '',
            })}
          >
            {isLikeLoading ? (
              'Updating'
            ) : (
              <>
                <Icon icon={isLiked ? 'solar:heart-bold' : 'solar:heart-linear'} size={NAV_ACTION_STYLES.icon} />
                {isLiked ? 'Liked' : 'Like List'}
              </>
            )}
          </button>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={NAV_ACTION_STYLES.row}>
        <button
          type="button"
          onClick={() => {
            if (guestMode === 'sign-in' && typeof onSignIn === 'function') {
              onSignIn();
              return;
            }

            window.location.assign(guestHref);
          }}
          className={actionClass()}
        >
          <Icon icon={guestIcon} size={NAV_ACTION_STYLES.icon} />
          {guestLabel}
        </button>
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
            <button type="button" onClick={() => onEditList?.()} className={actionClass()}>
              <Icon icon="solar:pen-bold" size={NAV_ACTION_STYLES.icon} />
              Edit List
            </button>
            <button type="button" onClick={() => onDeleteList?.()} className={actionClass({ tone: 'danger' })}>
              <Icon icon="solar:trash-bin-trash-bold" size={NAV_ACTION_STYLES.icon} />
              Delete List
            </button>
          </>
        ) : (
          <>
            {shouldShowInboxAction && (
              <button type="button" onClick={onOpenInbox} className={actionClass({ tone: 'info' })}>
                <Icon icon="solar:inbox-bold" size={NAV_ACTION_STYLES.icon} />
                Inbox {inboxCount}
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return null;
}
