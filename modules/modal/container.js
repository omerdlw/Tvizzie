'use client'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

function Title({ title, description, close }) {
  return (
    <div className="flex w-full items-center justify-between space-x-4 border-b border-white/10 p-4 sm:space-x-8 md:p-6">
      <div className="space-y-0.5">
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
        className="shrink-0 cursor-pointer rounded-full border border-white/10 p-3 text-white/70 transition-colors hover:border-transparent hover:bg-white/5 hover:text-white"
      >
        <Icon icon="material-symbols:close-rounded" size={24} />
      </button>
    </div>
  )
}

export default function Container({ children, className, header, close }) {
  return (
    <div className="flex w-full max-w-2xl min-w-sm flex-col bg-transparent">
      <Title
        description={header.description}
        title={header.title}
        close={close}
      />
      <div className={cn('h-auto w-full overflow-y-auto', className)}>
        {children}
      </div>
    </div>
  )
}
