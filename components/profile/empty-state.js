'use client'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

export function EmptyState({ action, description, icon, title, className }) {
    return (
        <div className={cn('group flex flex-col items-center justify-center text-center py-12', className)}>
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110">
                <Icon icon={icon} size={28} className="text-white/40 transition-colors duration-300 group-hover:text-white/60" />
            </div>
            <div className="flex flex-col items-center max-w-[280px]">
                <h3 className="text-base font-bold tracking-tight text-white">{title}</h3>
                {description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-white/40 font-medium">
                        {description}
                    </p>
                )}
            </div>
            {action && (
                <div className="mt-6 transition-transform duration-300 active:scale-95">
                    {action}
                </div>
            )}
        </div>
    )
}

export function FullScreenEmptyState({ action, description, icon, title }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-[1.5px] border-white/20">
                <Icon icon={icon} size={36} className="text-white/80" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {title}
            </h3>
            {description && (
                <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-white/30 sm:text-base">
                    {description}
                </p>
            )}
            {action && (
                <div className="mt-8 transition-transform duration-300 active:scale-95">
                    {action}
                </div>
            )}
        </div>
    )
}
