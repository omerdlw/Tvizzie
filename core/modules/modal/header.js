'use client'

export function resolveAuthVerificationHeader(config = {}) {
  const purpose = String(config?.data?.purpose || '')
    .trim()
    .toLowerCase()

  if (purpose === 'password-reset') {
    return {
      title: 'Password Reset Verification',
    }
  }

  if (purpose === 'account-delete') {
    return {
      title: 'Delete Account Verification',
    }
  }

  if (purpose === 'email-change') {
    return {
      title: 'Email Verification',
    }
  }

  if (purpose === 'password-change') {
    return {
      title: 'Password Verification',
    }
  }

  if (purpose === 'password-set') {
    return {
      title: 'Set Password Verification',
    }
  }

  if (purpose === 'provider-link') {
    return {
      title: 'Provider Verification',
    }
  }

  if (purpose === 'sign-in') {
    return {
      title: 'Login Verification',
    }
  }

  return {
    title: 'Email Verification',
  }
}

function resolveFollowListHeader(config = {}) {
  const type = String(config?.data?.type || '')
    .trim()
    .toLowerCase()

  if (type === 'following') {
    return {
      title: 'Following',
    }
  }

  if (type === 'requests') {
    return {
      title: 'Inbox',
    }
  }

  return {
    title: 'Followers',
  }
}

function resolveListEditorHeader(config = {}) {
  const isEditing = Boolean(config?.data?.initialData?.id)

  return isEditing
    ? {
        title: 'Edit List',
      }
    : {
        title: 'Create List',
      }
}


function resolveNotificationsHeader() {
  return {
    title: 'Notifications',
  }
}

function resolveReviewEditorHeader() {
  return {
    title: null,
  }
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
}

export function resolveModalHeader(modalType, config = {}) {
  const header =
    config?.header && typeof config.header === 'object' ? config.header : {}
  const fallbackResolver = DEFAULT_MODAL_HEADERS[modalType]
  const fallbackHeader =
    typeof fallbackResolver === 'function' ? fallbackResolver(config) : {}

  return {
    title: header.title ?? config?.title ?? fallbackHeader.title ?? null,
  }
}
