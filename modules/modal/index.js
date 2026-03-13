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

const Modal = () => {
  const {
    props: data,
    description,
    closeModal,
    modalType,
    position,
    responsivePosition,
    isOpen,
    chrome,
    title,
    label,
  } = useModal()

  const registry = useModalRegistry()
  const modalRef = useRef(null)
  const focusableRef = useRef([])
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

  const activePosition = useMemo(() => {
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
  }, [isMobileViewport, position, responsivePosition])

  useEffect(() => {
    if (!isOpen || !modalRef.current) {
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
  }, [isOpen, modalType])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal()
      }

      if (e.key === 'Tab' && focusableRef.current.length > 0) {
        const elements = focusableRef.current
        const firstElement = elements[0]
        const lastElement = elements[elements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, closeModal])

  const SpecificModalComponent = registry.get(modalType)

  if (!mounted) return null

  const isPanelChrome = chrome !== MODAL_CHROME.BARE
  const isLeftModal = activePosition === MODAL_POSITIONS.LEFT
  const isRightModal = activePosition === MODAL_POSITIONS.RIGHT
  const isTopModal = activePosition === MODAL_POSITIONS.TOP
  const isBottomModal = activePosition === MODAL_POSITIONS.BOTTOM
  const isCenterModal = activePosition === MODAL_POSITIONS.CENTER

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && modalType && SpecificModalComponent && (
        <div
          style={{ zIndex: Z_INDEX.MODAL }}
          className={cn(
            'fixed inset-0 flex flex-col',
            POSITION_CLASSES[activePosition] || POSITION_CLASSES[MODAL_POSITIONS.CENTER]
          )}
          aria-labelledby="modal-title"
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-3xl"
            style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
            variants={BACKDROP_VARIANTS}
            onClick={closeModal}
            animate="visible"
            initial="hidden"
            exit="hidden"
          />
          <motion.div
            className={cn(
              'relative flex transform-gpu flex-col',
              isPanelChrome
                ? 'overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl'
                : 'overflow-visible border-transparent bg-transparent backdrop-blur-none',
              isPanelChrome && isCenterModal && 'rounded-[30px]',
              isPanelChrome &&
                isTopModal &&
                'w-full self-stretch rounded-t-none rounded-b-[30px] sm:mt-2 sm:w-auto sm:self-auto sm:rounded-[30px]',
              isPanelChrome &&
                isBottomModal &&
                'w-full self-stretch rounded-b-none rounded-t-[30px] sm:mb-2 sm:w-auto sm:self-auto sm:rounded-[30px]',
              isPanelChrome &&
                (isLeftModal || isRightModal) &&
                'h-screen max-h-screen w-full self-stretch rounded-none sm:my-2 sm:h-[calc(100vh-1rem)] sm:w-auto sm:self-auto'
            )}
            variants={getModalVariants(activePosition)}
            style={{ zIndex: Z_INDEX.MODAL, willChange: 'transform, opacity' }}
            animate="visible"
            initial="hidden"
            ref={modalRef}
            exit="exit"
          >
            <ModuleError name={modalType}>
              <SpecificModalComponent
                header={{ title, description, label }}
                close={closeModal}
                data={data}
              />
            </ModuleError>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

export default Modal
