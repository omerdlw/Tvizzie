'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

import Modal from '@/modules/modal'
import {
  MODAL_BREAKPOINTS,
  MODAL_CHROME,
  MODAL_POSITIONS,
  MODAL_PRESETS,
} from '@/modules/modal/config'

const ModalActionsContext = createContext(null)
const ModalStateContext = createContext(null)

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function resolveResponsivePosition(position, responsivePosition) {
  if (!isObject(responsivePosition) || typeof window === 'undefined') {
    return position
  }

  const isMobile = window.matchMedia(
    `(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`
  ).matches

  if (isMobile && responsivePosition.mobile) {
    return responsivePosition.mobile
  }

  if (!isMobile && responsivePosition.desktop) {
    return responsivePosition.desktop
  }

  return position
}

function normalizePositionConfig(positionInput, config = {}) {
  const positionFromArg =
    typeof positionInput === 'string' ? positionInput : MODAL_POSITIONS.CENTER
  const responsiveFromArg = isObject(positionInput) ? positionInput : null
  const responsiveFromConfig = isObject(config.responsivePosition)
    ? config.responsivePosition
    : null

  const responsivePosition = responsiveFromConfig || responsiveFromArg
  const resolvedPosition = resolveResponsivePosition(
    positionFromArg,
    responsivePosition
  )

  return { resolvedPosition, responsivePosition }
}

function createModalStateFromStack(modalStack = []) {
  const activeModal = modalStack[modalStack.length - 1] || null

  return {
    position: activeModal?.position || MODAL_POSITIONS.CENTER,
    responsivePosition: activeModal?.responsivePosition || null,
    description: activeModal?.description || null,
    label: activeModal?.label || null,
    modalType: activeModal?.modalType || null,
    activeModalId: activeModal?.id || null,
    isOpen: modalStack.length > 0,
    chrome: activeModal?.chrome || MODAL_CHROME.PANEL,
    title: activeModal?.title || null,
    props: activeModal?.props || {},
    modalStack,
  }
}

const INITIAL_STATE = {
  ...createModalStateFromStack([]),
}

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState(INITIAL_STATE)
  const modalStackRef = useRef([])
  const resolveMapRef = useRef(new Map())
  const onCloseMapRef = useRef(new Map())
  const modalIdRef = useRef(0)

  const syncModalStack = useCallback((nextStack) => {
    modalStackRef.current = nextStack
    setModalState(createModalStateFromStack(nextStack))
  }, [])

  const openModal = useCallback(
    (modalType, position = MODAL_POSITIONS.CENTER, config = {}) => {
      const preset = MODAL_PRESETS[modalType] || {}
      const resolvedConfig = { ...preset, ...config }
      const { resolvedPosition, responsivePosition } = normalizePositionConfig(
        position,
        resolvedConfig
      )
      const { header, data, onClose, chrome } = resolvedConfig
      const resolvedHeader = {
        description: header?.description ?? resolvedConfig.description ?? null,
        title: header?.title ?? resolvedConfig.title ?? null,
        label: header?.label ?? resolvedConfig.label ?? null,
      }

      const modalId = ++modalIdRef.current
      const modalEntry = {
        id: modalId,
        position: resolvedPosition,
        responsivePosition,
        description: resolvedHeader.description,
        title: resolvedHeader.title,
        label: resolvedHeader.label,
        chrome: chrome || MODAL_CHROME.PANEL,
        props: data ?? resolvedConfig,
        modalType,
      }

      syncModalStack([...modalStackRef.current, modalEntry])

      return new Promise((resolve) => {
        resolveMapRef.current.set(modalId, resolve)
        onCloseMapRef.current.set(modalId, onClose || null)
      })
    },
    [syncModalStack]
  )

  const closeModal = useCallback(
    (result = null, targetModalId = null) => {
      const currentStack = modalStackRef.current
      if (!currentStack.length) {
        return
      }

      const modalIdToClose =
        targetModalId || currentStack[currentStack.length - 1]?.id || null

      if (!modalIdToClose) {
        return
      }

      const closedModal = currentStack.find(
        (modalEntry) => modalEntry.id === modalIdToClose
      )

      if (!closedModal) {
        return
      }

      const nextStack = currentStack.filter(
        (modalEntry) => modalEntry.id !== modalIdToClose
      )

      syncModalStack(nextStack)

      const onClose = onCloseMapRef.current.get(modalIdToClose)
      if (typeof onClose === 'function') {
        try {
          onClose(result)
        } catch {} // eslint-disable-line no-empty
      }
      onCloseMapRef.current.delete(modalIdToClose)

      const resolve = resolveMapRef.current.get(modalIdToClose)
      if (typeof resolve === 'function') {
        resolve(result)
      }
      resolveMapRef.current.delete(modalIdToClose)
    },
    [syncModalStack]
  )

  const actionsValue = useMemo(
    () => ({ openModal, closeModal }),
    [openModal, closeModal]
  )

  const stateValue = useMemo(() => modalState, [modalState])

  return (
    <ModalActionsContext.Provider value={actionsValue}>
      <ModalStateContext.Provider value={stateValue}>
        <Modal />
        {children}
      </ModalStateContext.Provider>
    </ModalActionsContext.Provider>
  )
}

export const useModalActions = () => {
  const context = useContext(ModalActionsContext)
  if (!context) {
    throw new Error('useModalActions must be used within a ModalProvider')
  }
  return context
}

export const useModalState = () => {
  const context = useContext(ModalStateContext)
  if (!context) {
    throw new Error('useModalState must be used within a ModalProvider')
  }
  return context
}

export const useModal = () => {
  const actions = useModalActions()
  const state = useModalState()
  return useMemo(() => ({ ...actions, ...state }), [actions, state])
}
