'use client';

import { motion } from 'framer-motion';

import { cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';

import { MODAL_MICRO_SPRING, MODAL_MICRO_TAP_SCALE } from './motion';

function CloseButton({ onClick }) {
  return (
    <motion.button
      type="button"
      aria-label="Close modal"
      whileTap={{ scale: MODAL_MICRO_TAP_SCALE }}
      transition={MODAL_MICRO_SPRING}
      onClick={onClick}
      className="center inline-flex size-8 shrink-0 cursor-pointer border border-white/5 bg-white/5 text-white/70 transition-colors duration-150 ease-linear hover:border-transparent hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
    >
      <Icon icon="material-symbols:close-rounded" size={16} />
    </motion.button>
  );
}

export function ModalTitle({ title, close, titleId, placement = 'embedded', className, style }) {
  if (!title) {
    return null;
  }

  const isAttachedTop = placement === 'attached-top';
  const isAttachedBottom = placement === 'attached-bottom';

  return (
    <div
      className={cn(
        'bg-primary flex items-center justify-between gap-2 border border-white/10 px-3 py-2',
        placement === 'embedded' && 'w-full border-x-0 border-t-0',
        isAttachedTop && 'max-w-full border-b-0',
        isAttachedBottom && 'max-w-full border-t-0',
        className,
      )}
      style={style}
    >
      <div className="min-w-0 flex-1 px-1 sm:px-2">
        <h2 id={titleId} className="text-base font-semibold tracking-wide text-white">
          {title}
        </h2>
      </div>

      <CloseButton onClick={close} />
    </div>
  );
}
