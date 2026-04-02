'use client'

import { cn } from '@/lib/utils'
import { MODAL_POSITIONS } from '@/modules/modal/config'
import { ModalTitle } from '@/modules/modal/title'

const HEIGHT_CONSTRAINT_PATTERN = /(^|\s)(?:[\w-]+:)*(?:h|max-h)-/

function hasHeightConstraint(className) {
  return (
    typeof className === 'string' && HEIGHT_CONSTRAINT_PATTERN.test(className)
  )
}

function isSideModal(position) {
  return position === MODAL_POSITIONS.LEFT || position === MODAL_POSITIONS.RIGHT
}

function getContainerClassName({ className, position }) {
  const sideModal = isSideModal(position)
  const usesExplicitHeightConstraint = hasHeightConstraint(className)

  return cn(
    'flex min-h-0 flex-col overflow-hidden bg-transparent',
    sideModal
      ? 'h-full max-h-full'
      : usesExplicitHeightConstraint
        ? null
        : 'max-h-[70dvh]',
    className
  )
}

export default function Container({ children, className, header, close }) {
  const position = header?.position
  const shouldRenderEmbeddedTitle = Boolean(
    header?.renderInside && header?.title
  )

  return (
    <div className={getContainerClassName({ className, position })}>
      {shouldRenderEmbeddedTitle && (
        <ModalTitle
          title={header.title}
          close={close}
          titleId={header.titleId}
          placement="embedded"
        />
      )}
      <div
        data-lenis-prevent
        data-lenis-prevent-wheel
        className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain"
      >
        {children}
      </div>
    </div>
  )
}
