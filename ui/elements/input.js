'use client';

import { forwardRef } from 'react';

import { cn, resolveSlotClasses } from './utils';

const Input = forwardRef(
  (
    {
      className,
      classNames = {},
      type = 'text',
      leftIcon,
      rightIcon,
      autoCapitalize = 'none',
      autoCorrect = 'off',
      ...props
    },
    ref
  ) => {
    const classes = resolveSlotClasses(className, classNames);

    return (
      <div className={cn(classes.wrapper)}>
        {leftIcon && <span className={cn(classes.leftIcon)}>{leftIcon}</span>}
        <input
          ref={ref}
          type={type}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          className={cn('m-0 min-w-0 flex-1 appearance-none bg-transparent p-0', classes.input, classes.root)}
          {...props}
        />
        {rightIcon && <span className={cn('shrink-0', classes.rightIcon)}>{rightIcon}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
