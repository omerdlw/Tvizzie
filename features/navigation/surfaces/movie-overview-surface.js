'use client';

import { motion } from 'framer-motion';

import { NAV_ACTION_SPRING, NAV_SURFACE_SPRING } from '@/core/modules/nav/motion';
import Icon from '@/ui/icon';

export default function MovieOverviewSurface({ close = null, overview = '', title = 'Overview' }) {
  const normalizedOverview = String(overview || '').trim();

  return (
    <motion.section
      className="flex max-h-screen w-full flex-col overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={NAV_SURFACE_SPRING}
    >
      <div className="border-grid-line flex items-center justify-between gap-3 border-b p-3">
        <p className="min-w-0 truncate text-sm font-bold tracking-wide uppercase">{title}</p>
        <motion.button
          type="button"
          onClick={() => close?.()}
          className="border-grid-line text-white-muted bg-primary inline-flex size-8 shrink-0 items-center justify-center rounded-xs border transition-colors hover:text-white"
          aria-label="Close overview"
          whileTap={{ scale: 0.96 }}
          transition={NAV_ACTION_SPRING}
        >
          <Icon icon="material-symbols:close-rounded" size={16} />
        </motion.button>
      </div>
      <div className="min-h-0 w-full overflow-y-auto p-3">
        <p className="text-white-soft text-sm leading-relaxed break-words whitespace-pre-wrap">{normalizedOverview}</p>
      </div>
    </motion.section>
  );
}
