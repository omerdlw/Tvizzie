'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'

import { Z_INDEX } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ModuleError } from '@/modules/error-boundary'
import {
  MODAL_BREAKPOINTS,
  MODAL_CHROME,
  MODAL_POSITIONS,
} from '@/modules/modal/config'
import { useModal } from '@/modules/modal/context'

import { useModalRegistry } from '../registry/context'
import { BACKDROP_VARIANTS, POSITION_CLASSES, getModalVariants } from './utils'

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

function resolveActivePosition(position, responsivePosition, isMobileViewport) {
  if (!responsivePosition || typeof responsivePosition !== 'object') {
    return position
  }

  if (isMobileViewport && responsivePosition.mobile) {
    return responsivePosition.mobile
  }

  if (!isMobileViewport && responsivePosition.desktop) {
    return responsivePosition.desktop
  }

  return position
}

function ModalLayer({
  entry,
  stackIndex,
  isTopModal,
  isMobileViewport,
  closeModal,
  registry,
}) {
  const modalRef = useRef(null)
  const focusableRef = useRef([])

  const activePosition = useMemo(
    () =>
      resolveActivePosition(
        entry.position,
        entry.responsivePosition,
        isMobileViewport
      ),
    [entry.position, entry.responsivePosition, isMobileViewport]
  )

  useEffect(() => {
    if (!isTopModal || !modalRef.current) {
      focusableRef.current = []
      return
    }

    const updateFocusable = () => {
      if (modalRef.current) {
        focusableRef.current = Array.from(
          modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        )
      }
    }

    updateFocusable()

    const observer = new MutationObserver(updateFocusable)
    observer.observe(modalRef.current, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [entry.id, isTopModal])

  useEffect(() => {
    if (!isTopModal) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal(null, entry.id)
      }

      if (event.key === 'Tab' && focusableRef.current.length > 0) {
        const elements = focusableRef.current
        const firstElement = elements[0]
        const lastElement = elements[elements.length - 1]

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        } else if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeModal, entry.id, isTopModal])

  const SpecificModalComponent = registry.get(entry.modalType)

  if (!SpecificModalComponent) {
    return null
  }

  const isPanelChrome = entry.chrome !== MODAL_CHROME.BARE
  const isLeftModal = activePosition === MODAL_POSITIONS.LEFT
  const isRightModal = activePosition === MODAL_POSITIONS.RIGHT
  const isTopPosition = activePosition === MODAL_POSITIONS.TOP
  const isBottomPosition = activePosition === MODAL_POSITIONS.BOTTOM
  const isCenterModal = activePosition === MODAL_POSITIONS.CENTER
  const layerBaseZIndex = Z_INDEX.MODAL + stackIndex * 2
  const backdropZIndex = layerBaseZIndex
  const modalZIndex = layerBaseZIndex + 1

  return (
    <motion.div
      key={entry.id}
      style={{ zIndex: layerBaseZIndex }}
      className={cn(
        'fixed inset-0 flex flex-col',
        POSITION_CLASSES[activePosition] ||
          POSITION_CLASSES[MODAL_POSITIONS.CENTER],
        isTopModal ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-labelledby="modal-title"
      aria-modal={isTopModal}
      role="dialog"
    >
      {isTopModal ? (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-3xl"
          style={{ zIndex: backdropZIndex }}
          variants={BACKDROP_VARIANTS}
          onClick={() => closeModal(null, entry.id)}
          animate="visible"
          initial="hidden"
          exit="hidden"
        />
      ) : null}
      <motion.div
        className={cn(
          'relative flex transform-gpu flex-col',
          isPanelChrome
            ? 'overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl'
            : 'overflow-visible border-transparent bg-transparent backdrop-blur-none',
          isPanelChrome && isCenterModal && 'rounded-[30px]',
          isPanelChrome &&
            isTopPosition &&
            'w-full self-stretch rounded-t-none rounded-b-[30px] sm:mt-2 sm:w-auto sm:self-auto sm:rounded-[30px]',
          isPanelChrome &&
            isBottomPosition &&
            'w-full self-stretch rounded-b-none rounded-t-[30px] sm:mb-2 sm:w-auto sm:self-auto sm:rounded-[30px]',
          isPanelChrome &&
            (isLeftModal || isRightModal) &&
            'h-screen max-h-screen w-full self-stretch rounded-none sm:my-2 sm:h-[calc(100vh-1rem)] sm:w-auto sm:self-auto'
        )}
        variants={getModalVariants(activePosition)}
        style={{ zIndex: modalZIndex, willChange: 'transform, opacity' }}
        animate="visible"
        initial="hidden"
        ref={modalRef}
        exit="exit"
      >
        <ModuleError name={entry.modalType}>
          <SpecificModalComponent
            header={{
              title: entry.title,
              description: entry.description,
              label: entry.label,
            }}
            close={(result) => closeModal(result, entry.id)}
            data={entry.props}
          />
        </ModuleError>
      </motion.div>
    </motion.div>
  )
}

const Modal = () => {
  const { modalStack = [], isOpen, closeModal } = useModal()

  const registry = useModalRegistry()
  const [mounted, setMounted] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(
      `(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`
    ).matches
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(max-width: ${MODAL_BREAKPOINTS.MOBILE_MAX_WIDTH}px)`
    )

    const handleChange = () => {
      setIsMobileViewport(mediaQuery.matches)
    }

    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!mounted) return null

  const modalContent = (
    <AnimatePresence mode="sync">
      {modalStack.map((entry, index) => (
        <ModalLayer
          key={entry.id}
          entry={entry}
          stackIndex={index}
          isTopModal={index === modalStack.length - 1}
          isMobileViewport={isMobileViewport}
          closeModal={closeModal}
          registry={registry}
        />
      ))}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

export default Modal
