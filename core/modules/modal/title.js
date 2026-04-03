'use client'

import { cn } from '@/core/utils'
import Icon from '@/ui/icon'

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center text-white transition-colors hover:text-white"
    >
      <Icon icon="material-symbols:close-rounded" size={18} />
    </button>
  )
}

export function ModalTitle({
  title,
  close,
  titleId,
  placement = 'embedded',
  className,
  style,
}) {
  if (!title) {
    return null
  }

  const isAttachedTop = placement === 'attached-top'
  const isAttachedBottom = placement === 'attached-bottom'

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 border border-white/10 px-3 py-2 backdrop-blur-xl',
        placement === 'embedded' && 'w-full bg-transparent border-x-0 border-t-0 backdrop-blur-none!',
        isAttachedTop &&
          'max-w-full border-b-0 rounded-t-[30px]',
        isAttachedBottom &&
          'max-w-full border-t-0',
        className
      )}
      style={style}
    >
      <div className="min-w-0 flex-1 px-1 sm:px-2">
        <h2
          id={titleId}
          className="text-base font-semibold tracking-wide text-white"
        >
          {title}
        </h2>
      </div>

      <CloseButton onClick={close} />
    </div>
  )
}
