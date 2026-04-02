'use client'

import Icon from '@/ui/icon'

export default function AccountBioMask({
  description = '',
  onClose = null,
  title = 'About',
}) {
  return (
    <section className="p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-wide text-white text-white uppercase">
            {title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="center cursor-pointer p-1 transition-all surface-muted"
          aria-label="Close bio"
        >
          <Icon icon="material-symbols:close-rounded" size={24} />
        </button>
      </div>
      <p className="text-sm leading-relaxed text-white whitespace-pre-wrap break-words">
        {description}
      </p>
    </section>
  )
}
