'use client';

import { createContext, forwardRef, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Description, Icon as BadgeIcon, Title } from '@/modules/nav/elements';
import {
  NAV_MICRO_TRANSITION,
  NAV_SURFACE_TRANSITION,
  NAV_TAP_SCALE,
  slideFadeVariants,
} from '@/modules/nav/nav-motion';
import { cn } from '@/shared/lib/classnames';
import Icon from '@/ui/icon';

const SurfaceHeaderContext = createContext(null);

export function useSurfaceHeader() {
  return useContext(SurfaceHeaderContext);
}

export function NavSurfaceHeader({
  icon = null,
  title = '',
  description = '',
  trailing = null,
  onClose = null,
  closeLabel = 'Close surface',
  descriptionMaxLines = 2,
  className = '',
}) {
  const hasClose = typeof onClose === 'function';

  return (
    <div className={cn('relative flex w-full items-center gap-3', hasClose && 'pr-10', className)}>
      {icon ? (
        <div className="center relative shrink-0">
          <BadgeIcon icon={icon} />
        </div>
      ) : null}

      <div className="relative flex min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col justify-center -space-y-0.5">
          <Title text={title} style={{ className: '!normal-case !truncate' }} />
          {description ? <Description text={description} maxLines={descriptionMaxLines} /> : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>

      {hasClose ? (
        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="center absolute top-0 right-0 z-10 size-8 cursor-pointer rounded-full border border-black/5 bg-black/5 text-black/70 transition-colors duration-150 ease-linear hover:border-transparent hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:outline-none"
          aria-label={closeLabel}
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
    onClose = null,
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
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={NAV_SURFACE_TRANSITION}
      >
        <NavSurfaceHeader
          descriptionMaxLines={descriptionMaxLines}
          description={headerState.description}
          trailing={headerState.trailing}
          title={headerState.title}
          icon={headerState.icon}
          closeLabel={closeLabel}
          onClose={onClose}
        />
        <div className={cn('w-full overflow-visible p-0.5', contentClassName)}>{children}</div>
      </motion.section>
    </SurfaceHeaderContext.Provider>
  );
});

export default NavSurfaceShell;
