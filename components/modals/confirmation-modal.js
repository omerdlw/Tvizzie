'use client'

import Container from '@/modules/modal/container'
import { Button } from '@/ui/elements'

import { MODAL_BUTTON, MODAL_LAYOUT } from './constants'

export default function ConfirmationModal({ close, data, header }) {
  const {
    description,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = true,
  } = data || {}

  return (
    <Container header={{ ...header }} close={close}>
      <div className="flex w-full flex-col gap-6 p-2.5">
        {description && (
          <p className="px-7 pt-5 text-sm leading-relaxed text-white/50">
            {description}
          </p>
        )}
        <div className={MODAL_LAYOUT.actionRow}>
          <Button
            onClick={close}
            className={`${MODAL_BUTTON.secondary} md:flex-initial`}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={() => {
              if (typeof onConfirm === 'function') {
                onConfirm()
              }
              close()
            }}
            className={`${
              isDestructive
                ? MODAL_BUTTON.destructive
                : MODAL_BUTTON.primary
            } md:flex-initial`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Container>
  )
}
