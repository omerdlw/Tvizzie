'use client'

import { forwardRef, useState } from 'react'

import * as Toggle from '@radix-ui/react-toggle'

import { cn, resolveSlotClasses } from '../utils'

const Button = forwardRef(
  (
    {
      variant = 'default',
      defaultActive = false,
      onToggle,
      className,
      classNames = {},
      onClick,
      disabled = false,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const [isActive, setIsActive] = useState(defaultActive)
    const classes = resolveSlotClasses(className, classNames)

    const dangerClasses =
      'border border-red-500/20 bg-[#450a0a] text-[#fca5a5] hover:bg-[#5a0c0c]'
    const baseClasses =
      'flex cursor-pointer items-center justify-center transition active:scale-95'

    if (variant === 'danger-icon') {
      return (
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            baseClasses,
            dangerClasses,
            'size-9 rounded-full',
            classes.root
          )}
          {...props}
        >
          {children}
        </button>
      )
    }

    if (variant === 'danger') {
      return (
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            baseClasses,
            dangerClasses,
            'h-9 gap-2 rounded-full px-4 text-[10px] font-bold tracking-[0.12em] uppercase',
            classes.root
          )}
          {...props}
        >
          {children}
        </button>
      )
    }

    if (variant === 'toggle') {
      const handleToggleChange = (pressed) => {
        setIsActive(pressed)
        if (onToggle) {
          onToggle(pressed)
        }
      }

      return (
        <Toggle.Root
          ref={ref}
          pressed={isActive}
          onPressedChange={handleToggleChange}
          disabled={disabled}
          className={cn(
            classes.root,
            classes.default,
            isActive && classes.toggle
          )}
          {...props}
        >
          {children}
        </Toggle.Root>
      )
    }

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(classes.root, classes.default)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
