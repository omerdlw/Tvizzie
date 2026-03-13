'use client'

import Container from '@/modules/modal/container'
import { Button } from '@/ui/elements'

import { MODAL_BUTTON, MODAL_LAYOUT } from './constants'

export default function NavigationGuardModal({ header, close, data }) {
  const { onConfirm, onCancel } = data || {}

  const handleConfirm = () => {
    onConfirm?.()
    close()
  }

  const handleCancel = () => {
    onCancel?.()
    close()
  }

  return (
    <Container header={{ ...header, label: 'Security' }} close={handleCancel}>
      <div className="flex w-full flex-col gap-6 p-2.5">
        <p className="text-sm leading-relaxed text-white/50">
          You have unsaved changes. Are you sure you want to leave this page?
        </p>

        <div className={`${MODAL_LAYOUT.actionRow} flex-col-reverse`}>
          <Button
            onClick={handleCancel}
            className={`${MODAL_BUTTON.secondary} md:flex-initial`}
          >
            Stay Here
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className={`${MODAL_BUTTON.destructive} md:flex-initial`}
          >
            Leave Page
          </Button>
        </div>
      </div>
    </Container>
  )
}
