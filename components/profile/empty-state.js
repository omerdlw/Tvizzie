'use client'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

export function EmptyState({ action, description, icon, title, className }) {
    return (
        <div className={cn('group flex flex-col items-center justify-center text-center transition-all duration-500', className)}>
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110">
                <div className="absolute inset-0 animate-pulse rounded-[24px] border border-white/5" />
                <Icon icon={icon} size={32} className="text-white/40 transition-colors duration-300 group-hover:text-white/60" />
            </div>
            <div className="flex flex-col items-center max-w-sm">
                <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
                {description && (
                    <p className="mt-2 text-sm leading-relaxed text-white/40 text-balance font-medium">
                        {description}
                    </p>
                )}
            </div>
            {action && (
                <div className="mt-8 transition-transform duration-300 active:scale-95">
                    {action}
                </div>
            )}
        </div>
    )
}

export function FullScreenEmptyState({ action, description, icon, title }) {
    return (
        <div className="relative flex min-h-[440px] w-full overflow-hidden rounded-[30px] mt-5 border border-dashed border-white/10 bg-white/2 p-3 center text-center">
                <div className="mx-auto w-auto space-y-3">
                    <h3 className="text-2xl font-black tracking-tight uppercase text-white sm:text-4xl">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-balance text-sm font-medium leading-relaxed text-white/30 sm:text-base">
                            {description}
                        </p>
                    )}
                </div>

                {action && (
                    <div className="mt-5 transition-transform duration-300 active:scale-95">
                        {action}
                    </div>
                )}
        </div>
    )
}
