'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import { useModal } from '@/modules/modal/context'

import { NAV_EVENT_HANDLERS } from '../events'
import { checkGuards } from '../guards'

export const GUARD_MODAL_KEY = 'NAV_GUARD_MODAL'

export const useNavigationCore = () => {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingPath, setPendingPath] = useState(null)
  const { openModal, closeModal } = useModal()
  const prevPathRef = useRef(pathname)

  const cancelNavigation = useCallback(() => {
    setPendingPath(null)
    closeModal()
  }, [closeModal])

  const blurActiveElement = useCallback(() => {
    if (typeof document === 'undefined') return
    document.activeElement?.blur?.()
  }, [])

  const navigateWithGuards = useCallback(
    async (href, { force = false } = {}) => {
      const from = pathname

      if (!force) {
        const guardResult = await checkGuards(href, from)
        if (guardResult.blocked) {
          blurActiveElement()
          setPendingPath(href)
          NAV_EVENT_HANDLERS.navigateStart(href, from)
          openModal(GUARD_MODAL_KEY, 'center', {
            header: {
              description: 'There are unsaved changes. Do you want to exit?',
              title: 'Warning',
            },
            data: {
              onConfirm: () => {
                blurActiveElement()
                setPendingPath(null)
                closeModal()
                router.push(href)
                NAV_EVENT_HANDLERS.navigate(href, from)
              },
              onCancel: cancelNavigation,
            },
          })
          return false
        }
      }

      blurActiveElement()
      NAV_EVENT_HANDLERS.navigateStart(href, from)
      router.push(href)
      NAV_EVENT_HANDLERS.navigate(href, from)
      return true
    },
    [blurActiveElement, cancelNavigation, closeModal, openModal, pathname, router]
  )

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      NAV_EVENT_HANDLERS.navigateEnd(pathname, prevPathRef.current)
      prevPathRef.current = pathname
    }
  }, [pathname])

  return {
    navigate: navigateWithGuards,
    pathname,
    pendingPath,
    cancelNavigation,
  }
}
