'use client'

import { useCallback, useEffect, useRef } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import { useNavigationActions } from '../context'

import { NAV_EVENT_HANDLERS } from '../events'
import { checkGuards } from '../guards'

function blurActiveElement() {
  if (typeof document === 'undefined') return
  document.activeElement?.blur?.()
}

export function useNavigationCore() {
  const pathname = usePathname()
  const router = useRouter()
  const { clearGuardConfirmation, setGuardConfirmation } =
    useNavigationActions()
  const previousPathRef = useRef(pathname)

  const cancelNavigation = useCallback(() => {
    clearGuardConfirmation()
  }, [clearGuardConfirmation])

  const openGuardConfirmation = useCallback(
    ({ href, from, message }) => {
      NAV_EVENT_HANDLERS.navigateStart(href, from)

      setGuardConfirmation({
        title: 'Warning',
        description:
          message || 'You have unsaved changes. Are you sure you want to leave this page?',
        cancelText: 'Stay Here',
        confirmText: 'Leave Page',
        tone: 'danger',
        isDestructive: true,
        onCancel: cancelNavigation,
        onConfirm: () => {
          blurActiveElement()
          clearGuardConfirmation()
          router.push(href)
          NAV_EVENT_HANDLERS.navigate(href, from)
        },
      })
    },
    [cancelNavigation, clearGuardConfirmation, router, setGuardConfirmation]
  )

  const navigate = useCallback(
    async (href, { force = false } = {}) => {
      const from = pathname

      if (!force) {
        const guardResult = await checkGuards(href, from)

        if (guardResult.blocked) {
          blurActiveElement()
          openGuardConfirmation({ href, from, message: guardResult.message })
          return false
        }
      }

      clearGuardConfirmation()
      blurActiveElement()
      NAV_EVENT_HANDLERS.navigateStart(href, from)
      router.push(href)
      NAV_EVENT_HANDLERS.navigate(href, from)

      return true
    },
    [clearGuardConfirmation, openGuardConfirmation, pathname, router]
  )

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return
    }

    clearGuardConfirmation()
    NAV_EVENT_HANDLERS.navigateEnd(pathname, previousPathRef.current)
    previousPathRef.current = pathname
  }, [clearGuardConfirmation, pathname])

  return {
    navigate,
    pathname,
    cancelNavigation,
  }
}
