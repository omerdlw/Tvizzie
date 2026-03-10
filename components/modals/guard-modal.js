'use client'

import { Button } from '@/ui/elements'
import Container from '@/modules/modal/container'

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

        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end pr-0.5">
          <Button
            onClick={handleCancel}
            className="rounded-full bg-white/5 px-8 h-12 flex-auto md:flex-initial cursor-pointer text-[11px] font-bold tracking-[0.2em] uppercase text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Stay Here
          </Button>
          <Button
            onClick={handleConfirm}
            className="rounded-full flex-auto md:flex-initial px-8 h-12 text-[11px] font-bold tracking-[0.2em] uppercase cursor-pointer bg-red-500 hover:bg-red-600 text-white transition"
          >
            Leave Page
          </Button>
        </div>
      </div>
    </Container>
  )
}
