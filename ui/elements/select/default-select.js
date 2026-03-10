'use client'

import { forwardRef } from 'react'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

import { Z_INDEX } from '@/lib/constants'

import { cn, resolveSlotClasses } from '../utils'

const DefaultSelect = forwardRef(
  (
    {
      options = [],
      value,
      onChange,
      placeholder = 'Select...',
      className,
      classNames = {},
      disabled = false,
      leftIcon,
      rightIcon,
    },
    ref
  ) => {
    const classes = resolveSlotClasses(className, classNames)
    const selectedOption = options.find((opt) => opt.value === value)

    return (
      <SelectPrimitive.Root
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn(
            classes.value,
            classes.trigger,
            classes.root,
            'inline-flex w-full items-center justify-between'
          )}
        >
          {leftIcon && <span className={cn(classes.leftIcon)}>{leftIcon}</span>}
          <SelectPrimitive.Value placeholder={placeholder}>
            {selectedOption?.label || placeholder}
          </SelectPrimitive.Value>
          {rightIcon ? (
            <span className={cn(classes.rightIcon)}>{rightIcon}</span>
          ) : (
            <SelectPrimitive.Icon className={cn(classes.icon)}>
              <ChevronDown size={16} />
            </SelectPrimitive.Icon>
          )}
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn('min-w-(--radix-select-trigger-width)', classes.menu)}
            position="popper"
            sideOffset={8}
            style={{ zIndex: Z_INDEX.SELECT }}
          >
            <SelectPrimitive.Viewport className={cn(classes.optionsList)}>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    classes.option,
                    value === option.value && classes.optionActive,
                    'relative flex items-center'
                  )}
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator
                    className={cn(classes.indicator)}
                  >
                    <Check size={16} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    )
  }
)

DefaultSelect.displayName = 'DefaultSelect'

export default DefaultSelect
