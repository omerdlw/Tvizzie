'use client';

import { motion } from 'framer-motion';

import Icon from '@/ui/icon';
import { FEATURE_NAV_ACTION_BUTTON_MOTION, FEATURE_NAV_ACTION_ROW_MOTION } from '@/features/motion';

export default function AccountBioSurface({ description = '', onClose = null, title = 'About' }) {
  const normalizedDescription = String(description || '').trim();

  return (
    <motion.section className="overflow-hidden" {...FEATURE_NAV_ACTION_ROW_MOTION}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
        <p className="text-sm font-bold tracking-wide uppercase">{title}</p>
        <motion.button
          type="button"
          onClick={() => onClose?.()}
          className="absolute top-0 right-0 inline-flex size-8 items-center justify-center border border-white/10 bg-primary text-white/50 hover:text-white"
          aria-label="Close bio"
          {...FEATURE_NAV_ACTION_BUTTON_MOTION}
        >
          <Icon icon="material-symbols:close-rounded" size={16} />
        </motion.button>
      </div>
      <div className="max-h-[min(40dvh,18rem)] w-full overflow-y-auto p-3">
        <p className="text-sm leading-relaxed text-white/50 [overflow-wrap:anywhere] break-words whitespace-pre-wrap">
          {normalizedDescription}
        </p>
      </div>
    </motion.section>
  );
}
