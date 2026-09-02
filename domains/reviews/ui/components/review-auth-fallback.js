'use client';

import { Button } from '@/ui/primitives';

export default function ReviewAuthFallback({
  mode = 'review',
  onSignIn,
  title,
  variant = 'default',
}) {
  const helperText =
    mode === 'comment'
      ? `Sign in to leave a comment on ${title}`
      : `Sign in to leave a rating or review for ${title}`;
  const isAccountSection = variant === 'account-section';

  return (
    <div
      className={
        isAccountSection
          ? 'flex w-full items-center justify-between border-b border-white/10 p-4'
          : `flex w-full items-center justify-between ${
              mode === 'comment' ? 'border-b' : 'border-y'
            } ring-white/10 py-4`
      }
    >
      <div className="min-w-0">
        <p
          className={
            isAccountSection
              ? 'text-xs font-semibold text-white/70 uppercase'
              : 'text-sm font-semibold'
          }
        >
          Join the conversation
        </p>
        <p className="text-xs text-white/70">{helperText}</p>
      </div>
      <Button
        type="button"
        className="inline-flex items-center justify-between gap-2.5 rounded-full ring-1 ring-inset ring-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 uppercase hover:bg-white hover:text-black"
        onClick={onSignIn}
      >
        Sign In
      </Button>
    </div>
  );
}
