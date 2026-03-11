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
import { MODAL_POSITIONS } from '@/modules/modal/config'

const ModalActionsContext = createContext(null)
const ModalStateContext = createContext(null)

const INITIAL_STATE = {
  position: MODAL_POSITIONS.CENTER,
  description: null,
  label: null,
  modalType: null,
  isOpen: false,
  full: false,
  title: null,
  props: {},
}

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState(INITIAL_STATE)
  const resolveRef = useRef(null)
  const onCloseRef = useRef(null)

  const openModal = useCallback(
    (modalType, position = MODAL_POSITIONS.CENTER, config = {}) => {
      const { header, data, onClose } = config

      onCloseRef.current = onClose || null

      setModalState({
        description: header?.description || null,
        title: header?.title || null,
        label: header?.label || null,
        full: config.full || false,
        props: data || config,
        isOpen: true,
        modalType,
        position,
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
