'use client'

import Container from '@/modules/modal/container'

export default function SettingsModal({ close, header }) {
  return (
    <Container
      className="w-full sm:w-[460px]"
      header={{
        title: header?.title || 'Settings',
        description: header?.description || 'Preferences',
      }}
      close={close}
    >
      <div className="flex w-full flex-col gap-4 p-4 text-sm text-white/60">
        <p>Settings options are not available yet.</p>
      </div>
    </Container>
  )
}
