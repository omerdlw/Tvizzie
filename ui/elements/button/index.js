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
    const baseClasses =
      'flex cursor-pointer items-center justify-center transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60'
    const isDestructiveIconVariant =
      variant === 'destructive-icon' || variant === 'danger-icon'
    const isDestructiveVariant =
      variant === 'destructive' || variant === 'danger'
    const destructiveClasses =
      'border border-error/35 bg-error/15 text-error hover:bg-error/25'

    if (isDestructiveIconVariant) {
      return (
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            baseClasses,
            destructiveClasses,
            'size-9 rounded-full',
            classes.root
          )}
          {...props}
        >
          {children}
        </button>
      )
    }

    if (isDestructiveVariant) {
      return (
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            baseClasses,
            destructiveClasses,
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
