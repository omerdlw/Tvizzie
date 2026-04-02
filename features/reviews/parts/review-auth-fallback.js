'use client'

import { Button } from '@/ui/elements'
import Icon from '@/ui/icon'

export default function ReviewAuthFallback({ onSignIn, title }) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="relative hidden shrink-0 items-center justify-center overflow-hidden border border-white/5 bg-white/5 sm:flex sm:size-12">
        <Icon icon="solar:user-bold" size={24} className="text-white" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="-space-y-0.5">
          <h3 className="text-sm font-semibold text-white sm:text-base">
            Join the conversation
          </h3>
          <p className="text-xs leading-relaxed text-white sm:text-sm">
            Sign in to leave a rating or review for {title}.
          </p>
        </div>
        <Button
          className="flex h-10 shrink-0 cursor-pointer items-center gap-2 border border-transparent  px-4 text-xs text-white transition hover:border-white/10 hover: hover:text-white"
          onClick={onSignIn}
        >
          <Icon icon="solar:user-circle-bold" size={16} />
          Sign in
        </Button>
      </div>
    </div>
  )
}
