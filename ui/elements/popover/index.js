'use client'

import { forwardRef } from 'react'

import * as PopoverPrimitive from '@radix-ui/react-popover'

import Button from '../button'
import { cn, resolveSlotClasses } from '../utils'

const Popover = forwardRef(
  (
    {
      position = 'bottom',
      triggerProps = {},
      className,
      classNames = {},
      open,
      defaultOpen,
      onOpenChange,
      modal = false,
      children,
      ...props
    },
    ref
  ) => {
    const classes = resolveSlotClasses(className, classNames)
    const {
      children: triggerChildren,
      className: triggerClassName,
      classNames: triggerClassNames,
      ...restTriggerProps
    } = triggerProps
    const triggerClasses = resolveSlotClasses(
      triggerClassName,
      triggerClassNames
    )

    return (
      <PopoverPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        modal={modal}
      >
        <PopoverPrimitive.Trigger asChild>
          <Button className={triggerClasses} {...restTriggerProps}>
            {triggerChildren}
          </Button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            ref={ref}
            side={position}
            align="center"
            className={cn(classes.content, classes.root)}
            sideOffset={5}
            {...props}
          >
            {children}
            {classes.arrow && (
              <PopoverPrimitive.Arrow className={cn(classes.arrow)} />
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  }
)

Popover.displayName = 'Popover'

export default Popover
