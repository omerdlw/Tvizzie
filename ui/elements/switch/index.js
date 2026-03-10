'use client'

import { forwardRef } from 'react'

import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn, resolveSlotClasses } from '../utils'

const Switch = forwardRef(
  (
    {
      checked,
      defaultChecked,
      onCheckedChange,
      className,
      classNames = {},
      disabled = false,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const isChecked = checked !== undefined ? checked : undefined
    const classes = resolveSlotClasses(className, classNames)

    return (
      <label
        className={cn(
          classes.wrapper,
          'inline-flex cursor-pointer items-center',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        htmlFor={id}
      >
        <SwitchPrimitive.Root
          ref={ref}
          id={id}
          checked={isChecked}
          defaultChecked={defaultChecked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className={cn(
            classes.track,
            classes.root,
            isChecked && classes.trackActive,
            'relative inline-flex items-center'
          )}
          {...props}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              classes.circle,
              isChecked && classes.circleActive,
              'block transition-transform'
            )}
          />
        </SwitchPrimitive.Root>

        {children && <span className={cn(classes.label)}>{children}</span>}
      </label>
    )
  }
)

Switch.displayName = 'Switch'

export default Switch
