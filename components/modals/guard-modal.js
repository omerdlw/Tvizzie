'use client'

import Container from '@/modules/modal/container'
import { Button } from '@/ui/elements'

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
      <div className="flex w-full flex-col gap-6">
        <p className="text-sm leading-relaxed text-white/50">
          You have unsaved changes. Are you sure you want to leave this page?
        </p>

        <div className="flex flex-col-reverse gap-3 pr-0.5 md:flex-row md:justify-end">
          <Button
            onClick={handleCancel}
            className="h-12 flex-auto cursor-pointer rounded-full bg-white/5 px-8 text-[11px] font-bold tracking-[0.2em] text-white/60 uppercase transition hover:bg-white/10 hover:text-white md:flex-initial"
          >
            Stay Here
          </Button>
          <Button
            onClick={handleConfirm}
            className="h-12 flex-auto cursor-pointer rounded-full bg-red-500 px-8 text-[11px] font-bold tracking-[0.2em] text-white uppercase transition hover:bg-red-600 md:flex-initial"
          >
            Leave Page
          </Button>
        </div>
      </div>
    </Container>
  )
}
