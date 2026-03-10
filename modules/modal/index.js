'use client'

import { useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'

import { Z_INDEX } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ModuleError } from '@/modules/error-boundary'
import { MODAL_POSITIONS } from '@/modules/modal/config'
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
    isOpen,
    full,
    title,
    label,
  } = useModal()

  const registry = useModalRegistry()
  const modalRef = useRef(null)
  const focusableRef = useRef([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const isSideModal =
    position === MODAL_POSITIONS.LEFT || position === MODAL_POSITIONS.RIGHT
  const isTopBottom =
    position === MODAL_POSITIONS.TOP || position === MODAL_POSITIONS.BOTTOM
  const isCorner =
    position === MODAL_POSITIONS.TOP_LEFT ||
    position === MODAL_POSITIONS.TOP_RIGHT ||
    position === MODAL_POSITIONS.BOTTOM_LEFT ||
    position === MODAL_POSITIONS.BOTTOM_RIGHT

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && modalType && SpecificModalComponent && (
        <div
          style={{ zIndex: Z_INDEX.MODAL }}
          className={cn(
            'fixed inset-0 flex flex-col',
            POSITION_CLASSES[position],
            !full && 'p-6'
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
              'relative flex h-auto transform-gpu flex-col overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl',
              !full ? 'rounded-[30px]' : 'rounded-none',
              full &&
              position === MODAL_POSITIONS.TOP &&
              'w-full border-x-0 border-t-0',
              full &&
              position === MODAL_POSITIONS.BOTTOM &&
              'w-full border-x-0 border-b-0',
              full &&
              position === MODAL_POSITIONS.LEFT &&
              'h-full border-y-0 border-l-0',
              full &&
              position === MODAL_POSITIONS.RIGHT &&
              'h-full border-y-0 border-r-0',
              full ? 'max-h-full' : 'max-h-[90vh]',
              'max-w-full',
              !full && 'max-w-[95vw]',
              !full &&
              !isSideModal &&
              !isTopBottom &&
              !isCorner &&
              'md:min-w-[400px]',
              !full && (isSideModal || isCorner) && 'md:max-w-[400px]',
              !full && isTopBottom && 'md:max-w-[600px]',
              full &&
              (isTopBottom
                ? 'w-full'
                : isSideModal
                  ? 'h-full md:w-[400px]'
                  : '')
            )}
            variants={getModalVariants(position)}
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
