'use client';

const AUTH_VERIFICATION_TITLES = Object.freeze({
  'account-delete': 'Delete Account Verification',
  'email-change': 'Email Verification',
  'password-change': 'Password Verification',
  'password-reset': 'Password Reset Verification',
  'password-set': 'Set Password Verification',
  'provider-link': 'Provider Verification',
  'sign-in': 'Login Verification',
});

const FOLLOW_LIST_TITLES = Object.freeze({
  following: 'Following',
  requests: 'Inbox',
});

export function resolveAuthVerificationHeader(config = {}) {
  const purpose = String(config?.data?.purpose || '')
    .trim()
    .toLowerCase();

  return {
    title: AUTH_VERIFICATION_TITLES[purpose] || 'Email Verification',
  };
}

function resolveFollowListHeader(config = {}) {
  const type = String(config?.data?.type || '')
    .trim()
    .toLowerCase();

  return {
    title: FOLLOW_LIST_TITLES[type] || 'Followers',
  };
}

function resolveListEditorHeader(config = {}) {
  const isEditing = Boolean(config?.data?.initialData?.id);

  return isEditing
    ? {
        title: 'Edit List',
      }
    : {
        title: 'Create List',
      };
}

function resolveNotificationsHeader() {
  return {
    title: 'Notifications',
  };
}

function isListReviewConfig(config = {}) {
  const data = config?.data || {};

  return data?.review?.subjectType === 'list' || Boolean(data?.listId || data?.ownerId || data?.list);
}

function resolveReviewEditorHeader(config = {}) {
  const hasExistingReview = Boolean(config?.data?.review);
  const isListReview = isListReviewConfig(config);
  const actionLabel = hasExistingReview ? 'Edit' : 'Write';
  const subjectLabel = isListReview ? 'comment' : 'review';

  return {
    title: `${actionLabel} ${subjectLabel}`,
  };
}

const DEFAULT_MODAL_HEADERS = {
  AUTH_VERIFICATION_MODAL: resolveAuthVerificationHeader,
  FOLLOW_LIST_MODAL: resolveFollowListHeader,
  LIST_EDITOR_MODAL: resolveListEditorHeader,
  LIST_PICKER_MODAL: false,
  NOTIFICATIONS_MODAL: resolveNotificationsHeader,
  MEDIA_SOCIAL_PROOF_MODAL: () => ({
    title: 'Social Activity',
  }),
  REVIEW_EDITOR_MODAL: resolveReviewEditorHeader,
  SETTINGS_MODAL: () => ({
    title: 'Settings',
  }),
};

export function resolveModalHeader(modalType, config = {}) {
  const header = config?.header && typeof config.header === 'object' ? config.header : {};
  const fallbackResolver = DEFAULT_MODAL_HEADERS[modalType];
  const fallbackHeader = typeof fallbackResolver === 'function' ? fallbackResolver(config) : {};

  return {
    title: header.title ?? config?.title ?? fallbackHeader.title ?? null,
    actions: header.actions ?? config?.actions ?? fallbackHeader.actions ?? null,
    showClose: header.showClose ?? config?.showClose ?? fallbackHeader.showClose,
  };
}
