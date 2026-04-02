'use client'

import { forwardRef } from 'react'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

import { cn, resolveSlotClasses } from '../utils'

const Checkbox = forwardRef(
  (
    {
      checked,
      defaultChecked,
      onCheckedChange,
      className,
      classNames = {},
      checkIcon,
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
          disabled && 'cursor-not-allowed '
        )}
        htmlFor={id}
      >
        <CheckboxPrimitive.Root
          ref={ref}
          id={id}
          checked={isChecked}
          defaultChecked={defaultChecked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className={cn(
            classes.box,
            classes.root,
            isChecked && classes.boxActive,
            'center'
          )}
          {...props}
        >
          <CheckboxPrimitive.Indicator
            className={cn('center', classes.indicator)}
          >
            {checkIcon || <Check size={16} />}
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>

        {children && (
          <span className={cn(classes.label, isChecked && classes.labelActive)}>
            {children}
          </span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
