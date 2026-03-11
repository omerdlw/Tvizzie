'use client'

import { useMemo } from 'react'

import { useScrollToTop } from '@/lib/hooks'
import { useAuth } from '@/modules/auth'
import {
  useBackgroundActions,
  useBackgroundState,
} from '@/modules/background/context'
import Tooltip from '@/ui/elements/tooltip'
import Icon from '@/ui/icon'

import { useModal } from '../modal/context'

function useDefaultNavActions() {
  const { visible: showScrollTop, scrollToTop } = useScrollToTop(100)
  const { openModal } = useModal()
  const { isVideo, videoElement } = useBackgroundState()
  const { toggleMute } = useBackgroundActions()

  const { isAuthenticated, signOut } = useAuth()

  return useMemo(
    () => [
      {
        key: 'logout',
        icon: 'solar:logout-2-bold',
        tooltip: 'Logout',
        visible: isAuthenticated,
        order: 40,
        onClick: (e) => {
          e.stopPropagation()
          signOut()
        },
      },
      {
        key: 'scroll-top',
        icon: 'solar:arrow-up-bold',
        tooltip: 'Scroll to Top',
        visible: showScrollTop,
        order: 20,
        onClick: (e) => {
          e.stopPropagation()
          scrollToTop()
        },
      },
      {
        key: 'toggle-mute',
        icon: !videoElement?.muted
          ? 'solar:muted-bold'
          : 'solar:volume-loud-bold',
        tooltip: !videoElement?.muted ? 'Mute' : 'Unmute',
        visible: !!isVideo,
        order: 10,
        onClick: (e) => {
          e.stopPropagation()
          toggleMute()
        },
      },
      {
        key: 'settings',
        icon: 'solar:settings-bold',
        tooltip: 'Settings',
        visible: false,
        order: -100,
        onClick: (e) => {
          e.stopPropagation()
          openModal('SETTINGS_MODAL', 'center', {
            full: false,
            header: {
              description: 'Configure your preferences',
              title: 'Settings',
            },
          })
        },
      },
    ],
    [
      showScrollTop,
      scrollToTop,
      openModal,
      isVideo,
      videoElement?.muted,
      toggleMute,
      isAuthenticated,
      signOut,
    ]
  )
}

export function useNavActions({ activeItem } = {}) {
  const defaultActions = useDefaultNavActions()

  return useMemo(() => {
    if (activeItem?.path === 'not-found') return []
    if (activeItem?.isStatus) return []

    let extendedActions = []

    if (activeItem && activeItem.actions) {
      const actions = Array.isArray(activeItem.actions)
        ? activeItem.actions
        : [activeItem.actions]
      extendedActions = actions.map((action, index) => ({
        key: action.key || `action-${index}`,
        ...action,
      }))
    }

    const allActions = [...defaultActions, ...extendedActions]
      .filter((action) => action.visible !== false)
      .filter((action) => {
        if (action.key === 'settings' && activeItem?.hideSettings) return false
        if (action.key === 'scroll-top' && activeItem?.hideScroll) return false
        return true
      })
      .sort((a, b) => (b.order || 0) - (a.order || 0))

    return allActions
  }, [defaultActions, activeItem])
}

export function NavAction({ action }) {
  return (
    <Tooltip
      className="rounded-[10px] bg-white p-1 text-xs text-black"
      text={action.tooltip}
    >
      <button
        className="center z-10 cursor-pointer rounded-full bg-transparent p-1 ring ring-transparent transition-all hover:text-white hover:ring-white/10"
        onClick={action.onClick}
      >
        <Icon icon={action.icon} size={16} />
      </button>
    </Tooltip>
  )
}

export function NavActionsContainer({ activeItem }) {
  const actions = useNavActions({ activeItem })

  return (
    <div className="mr-2 flex shrink-0 items-center gap-1">
      {actions.map((action) => (
        <NavAction key={action.key} action={action} />
      ))}
    </div>
  )
}
