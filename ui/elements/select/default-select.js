'use client'

import { forwardRef } from 'react'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

import { Z_INDEX } from '@/lib/constants'
import Icon from '@/ui/icon/index'

import { cn, resolveSlotClasses } from '../utils'

const DefaultSelect = forwardRef(
  (
    {
      options = [],
      value,
      onChange,
      placeholder = 'Select',
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
            'flex items-center justify-center',
            classes.root,
            classes.trigger
          )}
        >
          {leftIcon && (
            <span
              className={cn(
                'inline-flex items-center justify-center shrink-0',
                classes.leftIcon
              )}
            >
              {leftIcon}
            </span>
          )}
          <span className={cn('inline-flex items-center', classes.value)}>
            <SelectPrimitive.Value placeholder={placeholder}>
              {selectedOption?.label || placeholder}
            </SelectPrimitive.Value>
          </span>
          {rightIcon ? (
            <span
              className={cn(
                'inline-flex items-center justify-center shrink-0',
                classes.rightIcon
              )}
            >
              {rightIcon}
            </span>
          ) : (
            <SelectPrimitive.Icon
              className={cn(
                'inline-flex items-center justify-center shrink-0',
                classes.icon
              )}
            >
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
                    'relative flex items-center gap-2'
                  )}
                >
                  {option.icon && (
                    <Icon
                      icon={option.icon}
                      size={14}
                      className={cn(classes.optionIcon)}
                    />
                  )}
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator
                    className={cn(classes.indicator)}
                  >
                    <Icon icon="solar:check-read-bold" size={16} />
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
