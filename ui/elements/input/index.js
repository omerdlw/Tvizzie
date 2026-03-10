'use client'

import { forwardRef } from 'react'

import { cn, resolveSlotClasses } from '../utils'

const Input = forwardRef(
  (
    {
      className,
      classNames = {},
      type = 'text',
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const classes = resolveSlotClasses(className, classNames)

    return (
      <div className={cn(classes.wrapper)}>
        {leftIcon && <span className={cn(classes.leftIcon)}>{leftIcon}</span>}
        <input
          ref={ref}
          type={type}
          className={cn('bg-transparent', classes.input, classes.root)}
          {...props}
        />
        {rightIcon && (
          <span className={cn(classes.rightIcon)}>{rightIcon}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
