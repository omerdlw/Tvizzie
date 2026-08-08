'use client';

/**
 * Media Reviews - Unauthenticated Fallback View
 * Path: features/media-reviews/parts/review-auth-fallback.js
 */

import { Button } from '@/ui/primitives';

export default function ReviewAuthFallback({
  mode = 'review',
  onSignIn,
  title,
  variant = 'default',
}) {
  const helperText =
    mode === 'comment'
      ? `Sign in to leave a comment on ${title}.`
      : `Sign in to leave a rating or review for ${title}.`;
  const isAccountSection = variant === 'account-section';

  return (
    <div
      className={
        isAccountSection
          ? '-mx-5 -mt-5 flex w-[calc(100%+2.5rem)] items-center justify-between border-b border-black/10 p-5 sm:-mx-6 sm:-mt-6 sm:w-[calc(100%+3rem)] sm:p-6'
          : `flex w-full items-center justify-between ${
              mode === 'comment' ? 'border-b' : 'border-y'
            } border-black/10 py-4`
      }
    >
      <div className="min-w-0">
        <p
          className={
            isAccountSection
              ? 'text-xs font-semibold tracking-widest text-black/70 uppercase'
              : 'text-sm font-semibold'
          }
        >
          Join the conversation
        </p>
        <p className="text-xs text-black/70">{helperText}</p>
      </div>
      <Button
        type="button"
        className="bg-primary/40 inline-flex items-center justify-between gap-2 rounded-xl border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase hover:bg-black hover:text-white"
        onClick={onSignIn}
      >
        Sign In
      </Button>
    </div>
  );
}
