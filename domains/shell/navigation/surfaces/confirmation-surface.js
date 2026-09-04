'use client';

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import { NAV_SURFACE_RENDER_MODE, useSurfaceHeader } from '@/modules/nav';
import { NavDescription, NavIcon as BadgeIcon, NavTitle } from '@/modules/nav';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';

const BUTTON_TONES = Object.freeze({
  danger:
    'ring-1 ring-inset ring-error/20 bg-error/10 text-error hover:bg-error hover:text-black hover:ring-error',
  muted:
    'ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10',
  primary:
    'ring-1 ring-inset ring-info/20 bg-info/10 text-info hover:bg-info hover:text-black hover:ring-info',
});

function resolveButtonTone(tone) {
  return BUTTON_TONES[tone] || BUTTON_TONES.muted;
}

function getButtonClassName({ tone = 'muted', className } = {}) {
  return cn(
    'center w-full cursor-pointer rounded-[20px] gap-2.5 px-4 py-2.5 text-xs font-semibold uppercase',
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

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' &&
    (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
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
    <div className="flex w-full flex-row items-center gap-2.5 overflow-visible">
      <Button
        type="button"
        disabled={isSubmitting}
        onClick={handleCancel}
        className={getButtonClassName({
          tone: 'muted',
          className: 'disabled:cursor-not-allowed',
        })}
      >
        {cancelText}
      </Button>

      <Button
        type="button"
        disabled={isSubmitting}
        onClick={handleConfirm}
        className={getButtonClassName({
          tone: confirmTone,
          className: 'disabled:cursor-wait',
        })}
      >
        <span key={isSubmitting ? 'submitting' : 'confirm'}>
          {isSubmitting ? confirmLoadingText : confirmText}
        </span>
      </Button>
    </div>
  );
}

export function createConfirmationSurfaceEntry(confirmation, fallbackItem = null) {
  if (!confirmation) {
    return null;
  }

  const icon = confirmation.icon ?? fallbackItem?.icon ?? null;
  const title = confirmation.title ?? fallbackItem?.title ?? fallbackItem?.name ?? null;
  const description = confirmation.description ?? fallbackItem?.description ?? null;
  const isImage = isImageIconSource(icon);

  return {
    renderMode: NAV_SURFACE_RENDER_MODE.COMPONENT,
    component: ConfirmationSurface,
    content: null,
    props: {
      confirmation: {
        ...confirmation,
        icon,
        title,
        description,
      },
    },
    action: null,
    showAction: false,
    dismissible: false,
    onClose: null,
    icon: isImage ? icon : '',
    title: isImage ? title : '',
    description: isImage ? description : '',
    trailing: null,
    closeLabel: confirmation.closeLabel ?? null,
  };
}

export default function ConfirmationSurface({ close = null, confirmation = {} }) {
  const { icon, title, description } = confirmation;
  const isImage = isImageIconSource(icon);

  function dismissCurrentConfirmation(result = null) {
    close?.(result);
  }

  const actions = (
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

  if (isImage) {
    return (
      <motion.div
        variants={textCrossfadeVariants}
        initial="hidden"
        animate="visible"
        transition={NAV_FADE_TRANSITION}
        className="w-full"
      >
        {actions}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className="flex w-full flex-col items-center gap-2.5 text-center"
    >
      {icon ? (
        <div className="center relative shrink-0">
          <BadgeIcon icon={icon} />
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-1.5 px-2">
        {title ? (
          <Title
            text={title}
            style={{ className: '!normal-case !text-base font-bold text-white' }}
          />
        ) : null}
        {description ? (
          <Description
            text={description}
            maxLines={4}
            style={{ className: '!text-sm text-white/70' }}
          />
        ) : null}
      </div>

      <div className="w-full">{actions}</div>
    </motion.div>
  );
}
