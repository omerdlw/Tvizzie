'use client';

import { createContext, forwardRef, useContext, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { Description, Icon as BadgeIcon, Title } from '@/modules/nav/elements';
import {
  NAV_FADE_TRANSITION,
  NAV_MICRO_TRANSITION,
  NAV_SURFACE_TRANSITION,
  NAV_TAP_SCALE,
  slideFadeVariants,
} from '@/modules/nav/motion';
import { cn } from '@/ui/class-names';
import Icon from '@/ui/primitives/icon';

const SurfaceHeaderContext = createContext(null);

export function useSurfaceHeader() {
  return useContext(SurfaceHeaderContext);
}

export function NavSurfaceHeader({
  icon = null,
  title = '',
  description = '',
  trailing = null,
  onBack = null,
  onClose = null,
  backLabel = 'Back to previous surface',
  closeLabel = 'Close surface',
  descriptionMaxLines = 2,
  className = '',
}) {
  const hasBack = typeof onBack === 'function';
  const hasClose = typeof onClose === 'function';
  const actionPadding = hasBack && hasClose ? 'pr-20' : hasBack || hasClose ? 'pr-10' : null;

  return (
    <div className={cn('relative flex w-full items-center gap-3', actionPadding, className)}>
      {icon ? (
        <motion.div
          className="center relative shrink-0"
          initial={{ opacity: 0, y: 6, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...NAV_MICRO_TRANSITION, delay: 0.06 }}
        >
          <BadgeIcon icon={icon} />
        </motion.div>
      ) : null}

      <div className="relative flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col justify-center -space-y-0.5">
          <Title text={title} style={{ className: '!normal-case !truncate' }} />
          {description ? <Description text={description} maxLines={descriptionMaxLines} /> : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>

      {hasBack ? (
        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBack();
          }}
          className="center absolute top-0 right-9 z-10 size-8 cursor-pointer border border-white/5 bg-white/5 text-white/70 transition-all duration-300 ease-in-out hover:border-transparent hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
          aria-label={backLabel}
          whileHover={{ scale: 1.08, y: -0.5 }}
          whileTap={{ scale: NAV_TAP_SCALE }}
          transition={NAV_MICRO_TRANSITION}
        >
          <Icon icon="solar:alt-arrow-left-bold" size={16} />
        </motion.button>
      ) : null}

      {hasClose ? (
        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="center absolute top-0 right-0 z-10 size-8 cursor-pointer border border-white/5 bg-white/5 text-white/70 transition-all duration-300 ease-in-out hover:border-transparent hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none"
          aria-label={closeLabel}
          whileHover={{ scale: 1.08, y: -0.5 }}
          whileTap={{ scale: NAV_TAP_SCALE }}
          transition={NAV_MICRO_TRANSITION}
        >
          <Icon icon="material-symbols:close-rounded" size={16} />
        </motion.button>
      ) : null}
    </div>
  );
}

export const NavSurfaceShell = forwardRef(function NavSurfaceShell(
  {
    icon = null,
    title = '',
    description = '',
    trailing = null,
    onBack = null,
    onClose = null,
    backLabel = 'Back to previous surface',
    closeLabel = 'Close surface',
    descriptionMaxLines = 2,
    className = '',
    contentClassName = '',
    children,
  },
  ref,
) {
  const [headerState, setHeaderState] = useState({
    icon,
    title,
    description,
    trailing,
  });

  useEffect(() => {
    setHeaderState({
      icon,
      title,
      description,
      trailing,
    });
  }, [icon, title, description, trailing]);

  return (
    <SurfaceHeaderContext.Provider value={setHeaderState}>
      <motion.section
        ref={ref}
        className={cn('relative flex flex-col gap-3 overflow-visible', className)}
        variants={slideFadeVariants}
        initial={false}
        animate="visible"
        exit="exit"
        transition={NAV_SURFACE_TRANSITION}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={NAV_FADE_TRANSITION}
        >
          <NavSurfaceHeader
            descriptionMaxLines={descriptionMaxLines}
            description={headerState.description}
            trailing={headerState.trailing}
            title={headerState.title}
            icon={headerState.icon}
            backLabel={backLabel}
            closeLabel={closeLabel}
            onBack={onBack}
            onClose={onClose}
          />
        </motion.div>
        <motion.div
          className={cn('w-full overflow-visible', contentClassName)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...NAV_FADE_TRANSITION, delay: 0.08 }}
        >
          {children}
        </motion.div>
      </motion.section>
    </SurfaceHeaderContext.Provider>
  );
});

export default NavSurfaceShell;
