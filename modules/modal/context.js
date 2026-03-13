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

const INITIAL_STATE = {
  position: MODAL_POSITIONS.CENTER,
  responsivePosition: null,
  description: null,
  label: null,
  modalType: null,
  isOpen: false,
  chrome: MODAL_CHROME.PANEL,
  title: null,
  props: {},
}

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState(INITIAL_STATE)
  const resolveRef = useRef(null)
  const onCloseRef = useRef(null)

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

      onCloseRef.current = onClose || null

      setModalState({
        position: resolvedPosition,
        responsivePosition,
        description: resolvedHeader.description,
        title: resolvedHeader.title,
        label: resolvedHeader.label,
        chrome: chrome || MODAL_CHROME.PANEL,
        props: data ?? resolvedConfig,
        isOpen: true,
        modalType,
      })

      return new Promise((resolve) => {
        resolveRef.current = resolve
      })
    },
    []
  )

  const closeModal = useCallback((result = null) => {
    if (onCloseRef.current) {
      try {
        onCloseRef.current(result)
      } catch {} // eslint-disable-line no-empty
      onCloseRef.current = null
    }

    if (resolveRef.current) {
      resolveRef.current(result)
      resolveRef.current = null
    }

    setModalState((prevState) => ({ ...prevState, isOpen: false }))
  }, [])

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
