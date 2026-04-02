'use client'

import { normalizeEmail } from './utils'
import AuthVerificationSurface from '@/features/navigation/surfaces/auth-verification-surface'
import { isPermissionDeniedError } from '@/lib/data/errors'

export function filterCollectionItems(items, itemToRemove) {
  const removedItemId = String(
    itemToRemove?.entityId || itemToRemove?.id || ''
  ).trim()
  const removedMediaType = String(
    itemToRemove?.media_type || itemToRemove?.entityType || ''
  )
    .trim()
    .toLowerCase()

  return items.filter((currentItem) => {
    if (itemToRemove?.mediaKey && currentItem?.mediaKey) {
      return currentItem.mediaKey !== itemToRemove.mediaKey
    }

    const currentItemId = String(
      currentItem?.entityId || currentItem?.id || ''
    ).trim()
    const currentMediaType = String(
      currentItem?.media_type || currentItem?.entityType || ''
    )
      .trim()
      .toLowerCase()

    return (
      currentItemId !== removedItemId || currentMediaType !== removedMediaType
    )
  })
}

export function showAccountErrorToast(toast, error, fallbackMessage) {
  if (isPermissionDeniedError(error)) {
    return false
  }

  toast.error(error?.message || fallbackMessage)
  return true
}

export async function openAuthVerificationPrompt({
  autoSendOnOpen = true,
  description,
  email,
  initialChallenge = null,
  openModal,
  openSurface,
  purpose,
  title,
  toast,
}) {
  const verificationEmail = normalizeEmail(email)

  try {
    const config = {
      header: {
        description,
        title,
      },
      data: {
        autoSendOnOpen,
        email: verificationEmail,
        initialChallenge,
        purpose,
      },
    }

    if (typeof openSurface === 'function') {
      return openSurface(AuthVerificationSurface, config)
    }

    if (typeof openModal === 'function') {
      return openModal('AUTH_VERIFICATION_MODAL', 'bottom', config)
    }

    const error = new Error('Verification prompt is unavailable')

    return {
      error,
      success: false,
    }
  } catch (error) {
    toast.error(error?.message || 'Verification prompt is unavailable')

    return {
      error,
      success: false,
    }
  }
}
