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
