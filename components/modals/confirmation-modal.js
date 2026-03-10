'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/ui/elements'
import Container from '@/modules/modal/container'

export default function ConfirmationModal({ close, data, header }) {
    const { title, description, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false, label = 'Confirmation' } = data || {}

    return (
        <Container header={{ ...header, title: title || header.title, label }} close={close}>
            <div className="flex w-full flex-col gap-6 p-2.5">
                {description && (
                    <p className="px-2.5 text-sm leading-relaxed text-white/50">
                        {description}
                    </p>
                )}

                <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                    <Button
                        onClick={close}
                        className="h-12 flex-auto cursor-pointer rounded-[20px] bg-white/5 px-8 text-[11px] font-bold tracking-[0.2em] uppercase text-white/60 transition hover:bg-white/10 hover:text-white md:flex-initial"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={() => {
                            if (typeof onConfirm === 'function') {
                                onConfirm()
                            }
                            close()
                        }}
                        className={cn(
                            'h-12 flex-auto cursor-pointer rounded-[20px] px-8 text-[11px] font-bold tracking-[0.2em] uppercase text-white transition md:flex-initial',
                            isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
                        )}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Container>
    )
}
