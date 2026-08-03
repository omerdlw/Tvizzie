'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/shared/utils';
import { NAV_SURFACE_RENDER_MODE } from '@/modules/nav';


const BUTTON_TONES = Object.freeze({
  danger:
    'border border-error/20 bg-error/10 text-error hover:bg-error hover:text-white hover:border-error',
  muted: 'border border-black/5 bg-black/5 hover:bg-transparent',
  primary:
    'border border-info/20 bg-info/10 text-info hover:bg-info hover:text-white hover:border-info',
});

function resolveButtonTone(tone) {
  return BUTTON_TONES[tone] || BUTTON_TONES.muted;
}

function getButtonClassName({ tone = 'muted', className } = {}) {
  return cn(
    'center w-full cursor-pointer gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ease-out hover:scale-[1.012] active:scale-[0.985]',
    resolveButtonTone(tone),
    className,
  );
}

function isPromiseLike(value) {
  return value != null && typeof value.then === 'function';
}

function stopEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

export function ConfirmationActions({ confirmation = {}, onCancel = null, onConfirm = null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmLockRef = useRef(false);

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

  function handleCancel(event) {
    stopEvent(event);

    if (isSubmitting || confirmLockRef.current) {
      return;
    }

    onCancel?.(event);
  }

  async function handleConfirm(event) {
    stopEvent(event);

    if (isSubmitting || confirmLockRef.current) {
      return;
    }

    confirmLockRef.current = true;
    let result = null;

    try {
      result = onConfirm?.(event);
    } catch (error) {
      console.error('Confirmation onConfirm failed:', error);
      confirmLockRef.current = false;
      return;
    }

    if (!isPromiseLike(result)) {
      confirmLockRef.current = false;
      return;
    }

    setIsSubmitting(true);

    try {
      await result;
    } catch (error) {
      void error;
    } finally {
      setIsSubmitting(false);
      confirmLockRef.current = false;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.24, 1] }}
      className="flex w-full flex-row items-center gap-2 overflow-visible"
    >
      <motion.button
        type="button"
        disabled={isSubmitting}
        onClick={handleCancel}
        className={getButtonClassName({
          tone: 'muted',
          className: 'disabled:cursor-not-allowed',
        })}
        whileHover={isSubmitting ? undefined : { scale: 1.012 }}
        whileTap={isSubmitting ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 450, damping: 26 }}
      >
        {cancelText}
      </motion.button>

      <motion.button
        type="button"
        disabled={isSubmitting}
        onClick={handleConfirm}
        className={getButtonClassName({
          tone: confirmTone,
          className: 'disabled:cursor-wait',
        })}
        whileHover={isSubmitting ? undefined : { scale: 1.012 }}
        whileTap={isSubmitting ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 450, damping: 26 }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={isSubmitting ? 'submitting' : 'confirm'}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.24, 1] }}
          >
            {isSubmitting ? confirmLoadingText : confirmText}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

export function createConfirmationSurfaceEntry(confirmation, fallbackItem = null) {
  if (!confirmation) {
    return null;
  }

  return {
    renderMode: NAV_SURFACE_RENDER_MODE.COMPONENT,
    component: ConfirmationSurface,
    content: null,
    props: {
      confirmation,
    },
    action: null,
    showAction: false,
    dismissible: false,
    onClose: null,
    icon: confirmation.icon ?? fallbackItem?.icon ?? null,
    title: confirmation.title ?? fallbackItem?.title ?? fallbackItem?.name ?? null,
    description: confirmation.description ?? fallbackItem?.description ?? null,
    trailing: null,
    closeLabel: confirmation.closeLabel ?? null,
  };
}

export default function ConfirmationSurface({ close = null, confirmation = {} }) {
  function dismissCurrentConfirmation(result = null) {
    close?.(result);
  }

  return (
    <ConfirmationActions
      confirmation={confirmation}
      onCancel={() => {
        confirmation.onCancel?.();
        dismissCurrentConfirmation({
          cancelled: true,
          success: false,
        });
      }}
      onConfirm={(event) => {
        const result = confirmation.onConfirm?.(event);

        if (!isPromiseLike(result)) {
          dismissCurrentConfirmation({
            success: true,
            value: result,
          });
          return result;
        }

        return Promise.resolve(result).then((value) => {
          dismissCurrentConfirmation({
            success: true,
            value,
          });
          return value;
        });
      }}
    />
  );
}
