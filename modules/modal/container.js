'use client'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

function Title({ title, description, label, close }) {
  return (
    <div className="flex w-full items-center justify-between space-x-4 p-3 border-b border-white/10 sm:space-x-8">
      <div className="space-y-0.5 ml-3">
        {label && (
          <p className="text-[10px] font-bold tracking-[0.2em] text-white/45 uppercase">
            {label}
          </p>
        )}
        {description && (
          <p className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
            {description}
          </p>
        )}
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={close}
        className="size-10 shrink-0 cursor-pointer rounded-full border border-white/10 text-white/70 transition-colors hover:border-transparent hover:bg-white/5 hover:text-white"
      >
        <Icon icon="material-symbols:close-rounded" size={24} />
      </button>
    </div>
  )
}

export default function Container({ children, className, header, close }) {
  return (
    <div
      className={cn(
        'flex max-h-[85vh] flex-col bg-transparent',
        className
      )}
    >
      {header?.title && (
        <Title
          description={header.description}
          label={header.label}
          title={header.title}
          close={close}
        />
      )}
      <div className="min-h-0 w-full flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
