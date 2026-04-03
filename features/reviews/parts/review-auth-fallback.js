'use client'

import { Button } from '@/ui/elements'

export default function ReviewAuthFallback({ onSignIn, title }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-white/5 bg-white/5 p-3 sm:p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">
          Join the conversation
        </p>
        <p className="text-xs text-white/70">
          Sign in to leave a rating or review for {title}.
        </p>
      </div>
      <Button
        type="button"
        className="h-10 shrink-0 px-4 text-[11px] font-semibold tracking-widest uppercase"
        onClick={onSignIn}
      >
        Sign In
      </Button>
    </div>
  )
}
