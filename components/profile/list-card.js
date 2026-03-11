'use client'

import { formatDate } from '@/lib/utils'
import Icon from '@/ui/icon'

export function ListCard({
    isOwner = false,
    list,
    onDelete,
    onEdit,
    onOpen,
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onOpen(list)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen(list)
                }
            }}
            className="group relative flex min-h-[280px] w-full cursor-pointer flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/5 text-left transition-all duration-500 hover:border-white/25 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
            {list.coverUrl ? (
                <div className="absolute inset-0 z-0">
                    <img
                        src={list.coverUrl}
                        alt={list.title}
                        className="h-full w-full object-cover opacity-30 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/50 to-black/30" />
                </div>
            ) : (
                <div className="absolute inset-0 z-0 bg-linear-to-br from-white/10 to-white/5" />
            )}

            <div className="relative z-10 flex flex-1 flex-col justify-end p-5 sm:p-6">
                <h3 className="truncate text-xl font-bold text-white drop-shadow-sm transition-colors group-hover:text-white sm:text-2xl">
                    {list.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/70">
                    {list.description || 'No description yet.'}
                </p>
                <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-[0.12em] text-white/40 uppercase">
                        {list.itemsCount} item{list.itemsCount === 1 ? '' : 's'}
                    </span>
                    <span className="text-[11px] font-medium text-white/35">
                        Updated {formatDate(list.updatedAt || list.createdAt)}
                    </span>
                </div>
                {isOwner && (
                    <div
                        className="mt-3 flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onEdit(list)
                            }}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white/90 transition hover:bg-white/20 active:scale-95"
                        >
                            <Icon icon="solar:pen-bold" size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onDelete(list)
                            }}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-xl bg-red-500/20 text-red-300 transition hover:bg-red-500/30 active:scale-95"
                        >
                            <Icon icon="solar:trash-bin-trash-bold" size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
