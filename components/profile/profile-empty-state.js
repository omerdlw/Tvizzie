'use client'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

export function EmptyState({ action, description, icon, title, className }) {
    return (
        <div className={cn('group flex flex-col items-center justify-center text-center transition-all duration-500', className)}>
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110">
                <Icon icon={icon} size={32} className="text-white/40 group-hover:text-white/60" />
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
        <div className="relative flex min-h-[440px] w-full flex-1 flex-col items-center justify-center overflow-hidden border-b-0 rounded-t-[30px] mt-5 border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center hover:bg-white/4 pb-[calc(var(--profile-nav-h,0px)+48px)]">
            <div className="relative z-10">
                <div className="mb-4 inline-flex">
                    <div className="relative h-28 w-28 center">
                        <Icon icon={icon} size={60} className="text-white/30" />
                    </div>
                </div>

                <div className="mx-auto max-w-md space-y-2">
                    <h3 className="text-3xl font-black tracking-tight uppercase text-white sm:text-5xl">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-balance text-sm font-semibold leading-relaxed text-white/30 sm:text-base">
                            {description}
                        </p>
                    )}
                </div>

                {action && (
                    <div className="mt-4 transition-transform duration-300 active:scale-95">
                        {action}
                    </div>
                )}
            </div>
        </div>
    )
}
