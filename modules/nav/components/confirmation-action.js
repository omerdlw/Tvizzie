'use client'

import { useState } from 'react'

import {
  NAV_ACTION_LAYOUT,
  navActionClass,
} from '@/components/nav-actions/constants'

import { useNavigationContext } from '../context'
import { getNavConfirmationKey } from '../utils'

function isPromiseLike(value) {
  return Boolean(value) && typeof value.then === 'function'
}

export default function ConfirmationAction({ item }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { dismissConfirmation } = useNavigationContext()
  const confirmation = item?.confirmation || {}
  const confirmationKey = getNavConfirmationKey(item)
  const confirmTone =
    confirmation.tone || (confirmation.isDestructive ? 'danger' : 'primary')

  const dismissCurrent = () => {
    dismissConfirmation(confirmationKey)
  }

  const handleCancel = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (isSubmitting) return

    confirmation.onCancel?.()
    dismissCurrent()
  }

  const handleConfirm = async (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (isSubmitting) return

    const result = confirmation.onConfirm?.(event)

    if (!isPromiseLike(result)) {
      dismissCurrent()
      return
    }

    setIsSubmitting(true)

    try {
      await result
      dismissCurrent()
    } catch {
      // Consumer-level error handling keeps the confirmation visible.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`${NAV_ACTION_LAYOUT.row} flex-col sm:flex-row`}>
      <button
        type="button"
        onClick={handleCancel}
        disabled={isSubmitting}
        className={navActionClass({
          tone: 'muted',
          className: 'w-full disabled:cursor-not-allowed disabled:opacity-50',
        })}
      >
        {confirmation.cancelText || 'Cancel'}
      </button>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isSubmitting}
        className={navActionClass({
          tone: confirmTone,
          className: 'w-full disabled:cursor-wait disabled:opacity-70',
        })}
      >
        {isSubmitting ? `${confirmation.confirmText || 'Confirm'}...` : confirmation.confirmText || 'Confirm'}
      </button>
    </div>
  )
}
