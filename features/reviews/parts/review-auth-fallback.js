'use client';

import { Button } from '@/ui/elements';

export default function ReviewAuthFallback({ mode = 'review', onSignIn, title }) {
  const helperText =
    mode === 'comment'
      ? `Sign in to leave a comment on ${title}.`
      : `Sign in to leave a rating or review for ${title}.`;

  return (
    <div className="grid-diamonds-top w-full border-t border-black/10">
      <div className="movie-detail-shell-inset flex w-full flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Join the conversation</p>
          <p className="text-xs leading-5 text-black/70">{helperText}</p>
        </div>
        <Button
          type="button"
          className="bg-primary/40 inline-flex min-h-10 w-full items-center justify-center gap-2 border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase transition ease-in-out hover:bg-black hover:text-white sm:w-auto"
          onClick={onSignIn}
        >
          Sign In
        </Button>
      </div>
    </div>
  );
}
