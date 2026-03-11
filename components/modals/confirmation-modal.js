'use client'

import { cn } from '@/lib/utils'
import Container from '@/modules/modal/container'
import { Button } from '@/ui/elements'

export default function ConfirmationModal({ close, data, header }) {
  const {
    description,
    onConfirm,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
  } = data || {}

  return (
    <Container header={{ ...header }} close={close}>
      <div className="flex w-full flex-col gap-6 p-2.5">
        {description && (
          <p className="px-7 pt-5 text-sm leading-relaxed text-white/50">
            {description}
          </p>
        )}
        <div className="flex w-full flex-col gap-3 md:flex-row md:justify-end">
          <Button
            onClick={close}
            className="h-12 w-full flex-auto cursor-pointer rounded-[20px] bg-white/5 px-8 text-[11px] font-bold tracking-[0.2em] text-white/60 uppercase transition hover:bg-white/10 hover:text-white md:flex-initial"
          >
            {cancelText}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (typeof onConfirm === 'function') {
                onConfirm()
              }
              close()
            }}
            className="h-12 w-full flex-auto md:flex-initial"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Container>
  )
}
