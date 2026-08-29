import { forwardRef, useEffect, useRef } from 'react';

import { cn, resolveSlotClasses } from './primitive-support';

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
      autoFocus,
      ...props
    },
    forwardedRef,
  ) => {
    const internalRef = useRef(null);
    const classes = resolveSlotClasses(className, classNames);

    useEffect(() => {
      if (autoFocus) {
        const inputEl = internalRef.current;
        if (inputEl) {
          inputEl.focus({ preventScroll: true });
        }
      }
    }, [autoFocus]);

    const setRef = (node) => {
      internalRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    return (
      <div className={cn(classes.wrapper)}>
        {leftIcon && <span className={cn(classes.leftIcon)}>{leftIcon}</span>}
        <input
          ref={setRef}
          type={type}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          className={cn(
            'm-0 min-w-0 flex-1 appearance-none bg-transparent p-0',
            classes.input,
            classes.root,
          )}
          {...props}
        />
        {rightIcon && <span className={cn('shrink-0', classes.rightIcon)}>{rightIcon}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
