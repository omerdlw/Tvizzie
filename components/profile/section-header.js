'use client'

export function SectionHeader({ action = null, eyebrow, title, description = null }) {
    return (
        <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold tracking-[0.24em] text-white/35 uppercase">
                        {eyebrow}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
                </div>
                {action}
            </div>
            {description && (
                <p className="mt-4 w-full text-sm leading-relaxed font-medium text-white/52">
                    {description}
                </p>
            )}
        </div>
    )
}
