'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { REGISTRY_TYPES, useRegistryState } from '../registry/context'

const ControlsStateContext = createContext({
  isOpen: false,
  right: null,
  left: null,
})
const ControlsActionsContext = createContext({
  toggleControls: () => {},
  closeControls: () => {},
  setControls: () => {},
})

export function ControlsProvider({ children }) {
  const [controls, setControlsState] = useState({ left: null, right: null })
  const [controlsHeight, setControlsHeight] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const { get } = useRegistryState()
  const registryControls = get(REGISTRY_TYPES.CONTROLS, 'page-controls')

  const setControls = useCallback((newControls) => {
    setControlsState(newControls)
  }, [])

  const toggleControls = useCallback(() => setIsOpen((prev) => !prev), [])
  const closeControls = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (registryControls) {
      setControls(registryControls)
    } else {
      setControls({ left: null, right: null })
    }
  }, [registryControls, setControls])

  const stateValue = useMemo(
    () => ({
      hasControls: !!(controls.right || controls.left),
      rightControls: controls.right,
      leftControls: controls.left,
      controlsHeight,
      isOpen,
    }),
    [controls, isOpen, controlsHeight]
  )

  const actionsValue = useMemo(
    () => ({
      setControlsHeight,
      toggleControls,
      closeControls,
      setControls,
    }),
    [toggleControls, closeControls, setControls]
  )

  return (
    <ControlsActionsContext.Provider value={actionsValue}>
      <ControlsStateContext.Provider value={stateValue}>
        {children}
      </ControlsStateContext.Provider>
    </ControlsActionsContext.Provider>
  )
}

export function useControlsState() {
  const context = useContext(ControlsStateContext)
  if (context === undefined) throw new Error('useControlsState error')
  return context
}

export function useControlsActions() {
  const context = useContext(ControlsActionsContext)
  if (context === undefined) throw new Error('useControlsActions error')
  return context
}
