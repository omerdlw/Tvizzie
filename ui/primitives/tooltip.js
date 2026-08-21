'use client';

import { forwardRef } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Z_INDEX } from '@/shared/constants';
import { cn, resolveSlotClasses } from './primitive-support';
const Tooltip = forwardRef(
  (
    {
      text,
      position = 'top',
      delayMs,
      className,
      classNames = {},
      children,
      open,
      defaultOpen,
      onOpenChange,
      sideOffset = 6,
      collisionPadding = 8,
      ...props
    },
    ref,
  ) => {
    const classes = resolveSlotClasses(className, classNames);

    const rootElement = (
      <TooltipPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        delayDuration={delayMs}
      >
        <TooltipPrimitive.Trigger asChild className={cn(classes.trigger)}>
          {children}
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            ref={ref}
            side={position}
            align="center"
            sideOffset={sideOffset}
            collisionPadding={collisionPadding}
            className={cn(
              'tooltip-content pointer-events-none z-(--z-tooltip) font-medium select-none',
              'rounded-md bg-white px-2.5 py-1 text-xs font-semibold tracking-tight text-black shadow-lg shadow-black/25',
              classes.content,
              classes.root,
            )}
            style={{
              '--z-tooltip': Z_INDEX.TOOLTIP,
            }}
            {...props}
          >
            {text}
            {classes.arrow && (
              <TooltipPrimitive.Arrow className={cn('fill-white', classes.arrow)} />
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );

    if (typeof delayMs === 'number') {
      return (
        <TooltipPrimitive.Provider delayDuration={delayMs} disableHoverableContent>
          {rootElement}
        </TooltipPrimitive.Provider>
      );
    }

    return rootElement;
  },
);
Tooltip.displayName = 'Tooltip';
export { Tooltip };
export default Tooltip;
