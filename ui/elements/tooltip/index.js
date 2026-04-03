'use client'

import { forwardRef } from 'react'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { DURATION, EASING, Z_INDEX } from '@/core/constants'

import { cn, resolveSlotClasses } from '../utils'

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
    const classes = resolveSlotClasses(className, classNames)

    return (
      <TooltipPrimitive.Provider delayDuration={delayMs}>
        <TooltipPrimitive.Root
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
        >
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
                DURATION.CLASS.FAST,
                EASING.CLASS.STANDARD,
                'bg-white py-1 px-2 font-semibold text-xs rounded-[8px] text-black!',
                classes.content,
                classes.root
              )}
              style={{ '--z-tooltip': Z_INDEX.TOOLTIP }}
              sideOffset={5}
              {...props}
            >
              {text}
              {classes.arrow && (
                <TooltipPrimitive.Arrow className={cn(classes.arrow)} />
              )}
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    )
  }
)

Tooltip.displayName = 'Tooltip'

export default Tooltip
