'use client';

// ── Modal contract and configuration ───────────────────────────────────────
// This file contains the data-only parts of the public modal contract. Keeping
// header resolution here makes the runtime and the view independent from
// feature-specific title rules.

export const MODAL_POSITIONS = Object.freeze({
  CENTER: 'center',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  LEFT: 'left',
  TOP: 'top',
});

export const MODAL_POSITION_CLASSES = Object.freeze({
  [MODAL_POSITIONS.CENTER]: 'items-center justify-center',
  [MODAL_POSITIONS.TOP]: 'items-center justify-start',
  [MODAL_POSITIONS.BOTTOM]: 'items-center justify-end',
  [MODAL_POSITIONS.LEFT]: 'items-start justify-start',
  [MODAL_POSITIONS.RIGHT]: 'items-end justify-start',
});

export const MODAL_CHROME = Object.freeze({
  PANEL: 'panel',
  BARE: 'bare',
});

export const MODAL_BREAKPOINTS = Object.freeze({
  MOBILE_MAX_WIDTH: 639,
});

export const MODAL_PRESETS = Object.freeze({
  PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
  VIDEO_PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
});

export const MODAL_LABELS = Object.freeze({
  ACCOUNT_SOCIAL_MODAL: 'Social',
  CAST_MODAL: 'Cast',
  LIST_EDITOR_MODAL: 'Edit List',
  MEDIA_SOCIAL_PROOF_MODAL: 'Social Proof',
  NOTIFICATIONS_MODAL: 'Notifications',
  PREVIEW_MODAL: 'Preview',
  VIDEO_PREVIEW_MODAL: 'Video',
});

const AUTH_VERIFICATION_TITLES = Object.freeze({
  'account-delete': 'Delete Account Verification',
  'email-change': 'Email Verification',
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

  return {
    title: isEditing ? 'Edit List' : 'Create List',
  };
}

function resolveNotificationsHeader() {
  return {
    title: 'Notifications',
  };
}

function isListReviewConfig(config = {}) {
  const data = config?.data || {};

  return (
    data?.review?.subjectType === 'list' || Boolean(data?.listId || data?.ownerId || data?.list)
  );
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
  NOTIFICATIONS_MODAL: resolveNotificationsHeader,
  MEDIA_SOCIAL_PROOF_MODAL: () => ({
    title: 'Social Activity',
  }),
  REVIEW_EDITOR_MODAL: resolveReviewEditorHeader,
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
