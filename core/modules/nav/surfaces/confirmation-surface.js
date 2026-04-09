'use client';

import { useMemo, useRef, useState } from 'react';

import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/core/constants';
import { cn } from '@/core/utils';
import { useNavigationContext } from '@/core/modules/nav/context';
import { getNavConfirmationKey } from '@/core/modules/nav/utils';

const BUTTON_TONES = Object.freeze({
  danger: DESTRUCTIVE_ACTION_TONE_CLASS,
  muted: 'border border-black/10 bg-primary hover:bg-white',
  primary: 'border border-info/20 bg-info/20 text-info hover:bg-info hover:text-white hover:border-info',
});

function resolveButtonTone(tone) {
  return BUTTON_TONES[tone] || BUTTON_TONES.muted;
}

function getButtonClassName({ tone = 'muted', className } = {}) {
  return cn(
    'center rounded-[12px] w-full cursor-pointer gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-[var(--motion-duration-fast)]',
    resolveButtonTone(tone),
    className
  );
}

function isPromiseLike(value) {
  return value != null && typeof value.then === 'function';
}

function stopEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

export default function ConfirmationSurface({ item }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmLockRef = useRef(false);
  const { dismissConfirmation } = useNavigationContext();

  const confirmation = item?.confirmation || {};
  const confirmationKey = getNavConfirmationKey(item);

  const cancelText = confirmation.cancelText || 'Cancel';
  const confirmText = confirmation.confirmText || 'Confirm';
  const confirmLoadingText =
    confirmation.confirmLoadingText ||
    confirmation.loadingText ||
    (confirmText === 'Leave Page' ? 'Leaving' : 'Processing');

  const confirmTone = useMemo(() => {
    if (confirmation.tone) {
      return confirmation.tone;
    }

    return confirmation.isDestructive ? 'danger' : 'primary';
  }, [confirmation.tone, confirmation.isDestructive]);

  function dismissCurrentConfirmation() {
    dismissConfirmation(confirmationKey);
  }

  function handleCancel(event) {
    stopEvent(event);

    if (isSubmitting || confirmLockRef.current) {
      return;
    }

    confirmation.onCancel?.();
    dismissCurrentConfirmation();
  }

  async function handleConfirm(event) {
    stopEvent(event);

    if (isSubmitting || confirmLockRef.current) {
      return;
    }

    confirmLockRef.current = true;
    let result = null;

    try {
      result = confirmation.onConfirm?.(event);
    } catch (error) {
      console.error('Confirmation onConfirm failed:', error);
      confirmLockRef.current = false;
      return;
    }

    if (!isPromiseLike(result)) {
      dismissCurrentConfirmation();
      confirmLockRef.current = false;
      return;
    }

    setIsSubmitting(true);

    try {
      await result;
      dismissCurrentConfirmation();
    } catch (error) {
      void error;
    } finally {
      setIsSubmitting(false);
      confirmLockRef.current = false;
    }
  }

  return (
    <div className="mt-2.5 flex w-full flex-col items-center gap-2 sm:flex-row">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleCancel}
        className={getButtonClassName({
          tone: 'muted',
          className: 'disabled:cursor-not-allowed',
        })}
      >
        {cancelText}
      </button>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleConfirm}
        className={getButtonClassName({
          tone: confirmTone,
          className: 'disabled:cursor-wait',
        })}
      >
        {isSubmitting ? confirmLoadingText : confirmText}
      </button>
    </div>
  );
}
