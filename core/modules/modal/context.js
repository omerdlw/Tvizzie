'use client';

import { createContext, useCallback, useContext, useState, useMemo, useRef } from 'react';

import Modal from '@/core/modules/modal';
import { MODAL_BREAKPOINTS, MODAL_POSITIONS, MODAL_PRESETS, MODAL_CHROME } from '@/core/modules/modal/config';
import { resolveModalHeader } from '@/core/modules/modal/header';

const FALLBACK_MODAL_STATE = Object.freeze({
  position: MODAL_POSITIONS.CENTER,
  responsivePosition: null,
  modalType: null,
  activeModalId: null,
  isOpen: false,
  chrome: MODAL_CHROME.PANEL,
  title: null,
  props: {},
  modalStack: [],
});

const FALLBACK_MODAL_ACTIONS = Object.freeze({
  openModal: async () => null,
  closeModal: () => {},
});

const ModalActionsContext = createContext(FALLBACK_MODAL_ACTIONS);
const ModalStateContext = createContext(FALLBACK_MODAL_STATE);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getResponsivePosition(position, responsivePosition) {
  if (!isPlainObject(responsivePosition) || typeof window === 'undefined') {
    return position;
  }

  const isMobileViewport = window.matchMedia(`(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`).matches;

  if (isMobileViewport && responsivePosition.mobile) {
    return responsivePosition.mobile;
  }

  if (!isMobileViewport && responsivePosition.desktop) {
    return responsivePosition.desktop;
  }

  return position;
}

function normalizePositionConfig(positionInput, config = {}) {
  const basePosition = typeof positionInput === 'string' ? positionInput : MODAL_POSITIONS.CENTER;

  const responsivePosition =
    (isPlainObject(config.responsivePosition) && config.responsivePosition) ||
    (isPlainObject(positionInput) && positionInput) ||
    null;

  return {
    position: getResponsivePosition(basePosition, responsivePosition),
    responsivePosition,
  };
}

function createModalState(modalStack = []) {
  const activeModal = modalStack[modalStack.length - 1] || null;

  return {
    position: activeModal?.position || MODAL_POSITIONS.CENTER,
    responsivePosition: activeModal?.responsivePosition || null,
    modalType: activeModal?.modalType || null,
    activeModalId: activeModal?.id || null,
    isOpen: modalStack.length > 0,
    chrome: activeModal?.chrome || MODAL_CHROME.PANEL,
    title: activeModal?.title || null,
    props: activeModal?.props || {},
    modalStack,
  };
}

const INITIAL_STATE = createModalState([]);

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState(INITIAL_STATE);

  const modalStackRef = useRef([]);
  const resolveMapRef = useRef(new Map());
  const onCloseMapRef = useRef(new Map());
  const modalIdRef = useRef(0);

  const syncModalStack = useCallback((nextStack) => {
    modalStackRef.current = nextStack;
    setModalState(createModalState(nextStack));
  }, []);

  const openModal = useCallback(
    (modalType, positionInput = MODAL_POSITIONS.CENTER, config = {}) => {
      const resolvedConfig = {
        ...(MODAL_PRESETS[modalType] || {}),
        ...config,
      };

      const { position, responsivePosition } = normalizePositionConfig(positionInput, resolvedConfig);

      const resolvedHeader = resolveModalHeader(modalType, resolvedConfig);
      const modalId = ++modalIdRef.current;

      const modalEntry = {
        id: modalId,
        modalType,
        position,
        responsivePosition,
        title: resolvedHeader.title,
        chrome: resolvedConfig.chrome || MODAL_CHROME.PANEL,
        props: resolvedConfig.data ?? resolvedConfig,
      };

      syncModalStack([...modalStackRef.current, modalEntry]);

      return new Promise((resolve) => {
        resolveMapRef.current.set(modalId, resolve);
        onCloseMapRef.current.set(modalId, resolvedConfig.onClose || null);
      });
    },
    [syncModalStack]
  );

  const closeModal = useCallback(
    (result = null, targetModalId = null) => {
      const currentStack = modalStackRef.current;

      if (currentStack.length === 0) {
        return;
      }

      const modalId = targetModalId || currentStack[currentStack.length - 1]?.id || null;

      if (!modalId) {
        return;
      }

      const modalToClose = currentStack.find((entry) => entry.id === modalId);

      if (!modalToClose) {
        return;
      }

      const nextStack = currentStack.filter((entry) => entry.id !== modalId);
      syncModalStack(nextStack);

      const onClose = onCloseMapRef.current.get(modalId);
      if (typeof onClose === 'function') {
        try {
          onClose(result);
        } catch (error) {
          console.error('Modal onClose handler failed:', error);
        }
      }
      onCloseMapRef.current.delete(modalId);

      const resolve = resolveMapRef.current.get(modalId);
      if (typeof resolve === 'function') {
        resolve(result);
      }
      resolveMapRef.current.delete(modalId);
    },
    [syncModalStack]
  );

  const actionsValue = useMemo(
    () => ({
      openModal,
      closeModal,
    }),
    [openModal, closeModal]
  );

  return (
    <ModalActionsContext.Provider value={actionsValue}>
      <ModalStateContext.Provider value={modalState}>
        <Modal />
        {children}
      </ModalStateContext.Provider>
    </ModalActionsContext.Provider>
  );
}

export function useModalActions() {
  const context = useContext(ModalActionsContext);
  return context;
}

export function useModalState() {
  const context = useContext(ModalStateContext);
  return context;
}

export function useModal() {
  const actions = useModalActions();
  const state = useModalState();

  return useMemo(() => ({ ...actions, ...state }), [actions, state]);
}
