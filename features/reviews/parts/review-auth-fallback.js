'use client';

import { Button } from '@/ui/elements';

export default function ReviewAuthFallback({ onSignIn, title }) {
  return (
    <div className="flex w-full items-center justify-between border-y border-black/10 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">Join the conversation</p>
        <p className="text-xs text-black/70">Sign in to leave a rating or review for {title}.</p>
      </div>
      <Button
        type="button"
        className="bg-primary/40 inline-flex items-center justify-between gap-2 border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase transition ease-in-out hover:bg-black hover:text-white"
        onClick={onSignIn}
      >
        Sign In
      </Button>
    </div>
  );
}
