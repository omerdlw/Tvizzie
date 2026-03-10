'use client'

import { useState } from 'react'

import { useNavigationContext } from '../context'
import { useNavigationCore } from './use-navigation-core'
import { useNavigationDisplay } from './use-navigation-display'
import { useRouteChangeEffects } from './use-navigation-effects'
import { useNavigationExpanded } from './use-navigation-expanded'
import { useNavigationLayout } from './use-navigation-layout'
import { useNavigationShortcuts } from './use-navigation-shortcuts'

export const useNavigation = () => {
  const { searchQuery } = useNavigationContext()
  const { navigate, pathname, pendingPath, cancelNavigation } =
    useNavigationCore()
  const { navigationItems, activeItem, activeIndex, statusState } =
    useNavigationDisplay()
  const expandedState = useNavigationExpanded()
  const { expanded, setExpanded, setSearchQuery } = expandedState
  const [isHovered, setIsHovered] = useState(false)
  const { isMacOS, shortcutSymbol } = useNavigationShortcuts({
    navigate,
    navigationItems,
  })
  const { displayItems } = useNavigationLayout({
    isHovered,
    navigationItems,
    activeItem,
  })
  useRouteChangeEffects(setExpanded, setSearchQuery, setIsHovered)
  const activeItemHasAction = !!activeItem?.action

  return {
    navigationItems: displayItems,
    activeItem,
    activeIndex,
    statusState,
    navigate,
    setExpanded,
    activeItemHasAction,
    expanded,
    isHovered,
    setIsHovered,
    searchQuery,
    pathname,
    pendingPath,
    expandParentForPath: expandedState.expandParentForPath,
    isParentExpanded: expandedState.isParentExpanded,
    toggleParent: expandedState.toggleParent,
    setNavHeight: expandedState.setNavHeight,
    setSearchQuery: expandedState.setSearchQuery,
    isMacOS,
    shortcutSymbol,
    cancelNavigation,
  }
}
