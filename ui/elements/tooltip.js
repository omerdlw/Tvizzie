'use client';

import { forwardRef } from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { Z_INDEX } from '@/core/constants';

import { cn, resolveSlotClasses } from './utils';

const Tooltip = forwardRef(
  (
    {
      text,
      position = 'top',
      delayMs = 200,
      className,
      classNames = {},
      children,
      open,
      defaultOpen,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    const classes = resolveSlotClasses(className, classNames);

    return (
      <TooltipPrimitive.Provider delayDuration={delayMs}>
        <TooltipPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          <TooltipPrimitive.Trigger asChild className={cn(classes.trigger)}>
            {children}
          </TooltipPrimitive.Trigger>

          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              ref={ref}
              side={position}
              align="center"
              className={cn(
                'animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-(--z-tooltip) font-medium',
                'duration-[200ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]',
                'bg-black px-2.5 py-1.5 text-xs font-semibold text-white',
                classes.content,
                classes.root
              )}
              style={{ '--z-tooltip': Z_INDEX.TOOLTIP }}
              sideOffset={5}
              {...props}
            >
              {text}
              {classes.arrow && <TooltipPrimitive.Arrow className={cn(classes.arrow)} />}
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    );
  }
);

Tooltip.displayName = 'Tooltip';

export default Tooltip;
