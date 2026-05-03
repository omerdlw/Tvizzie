'use client';

import { forwardRef, useState } from 'react';

import * as Toggle from '@radix-ui/react-toggle';

import { DESTRUCTIVE_ACTION_TONE_CLASS, INFO_ACTION_TONE_CLASS } from '@/core/constants';
import { cn, resolveSlotClasses } from './utils';
import { SUCCESS_ACTION_TONE_CLASS, WARNING_ACTION_TONE_CLASS } from '@/core/constants/index';

const SEMANTIC_VARIANT_CLASSES = Object.freeze({
  danger: DESTRUCTIVE_ACTION_TONE_CLASS,
  destructive: DESTRUCTIVE_ACTION_TONE_CLASS,
  info: INFO_ACTION_TONE_CLASS,
  success: SUCCESS_ACTION_TONE_CLASS,
  warning: WARNING_ACTION_TONE_CLASS,
});

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
    const [isActive, setIsActive] = useState(defaultActive);
    const classes = resolveSlotClasses(className, classNames);
    const baseClasses = 'flex cursor-pointer items-center justify-center transition disabled:cursor-not-allowed ';
    const semanticIconVariantClasses = SEMANTIC_VARIANT_CLASSES[variant.replace(/-icon$/, '')] || null;
    const semanticVariantClasses = SEMANTIC_VARIANT_CLASSES[variant] || null;

    if (semanticIconVariantClasses) {
      return (
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={cn(baseClasses, semanticIconVariantClasses, 'size-9', classes.root)}
          {...props}
        >
          {children}
        </button>
      );
    }

    if (semanticVariantClasses) {
      return (
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            baseClasses,
            semanticVariantClasses,
            'gap-2 px-4 text-[10px] font-bold tracking-widest uppercase',
            classes.root
          )}
          {...props}
        >
          {children}
        </button>
      );
    }

    if (variant === 'toggle') {
      const handleToggleChange = (pressed) => {
        setIsActive(pressed);
        if (onToggle) {
          onToggle(pressed);
        }
      };

      return (
        <Toggle.Root
          ref={ref}
          pressed={isActive}
          onPressedChange={handleToggleChange}
          disabled={disabled}
          className={cn(classes.root, classes.default, isActive && classes.toggle)}
          {...props}
        >
          {children}
        </Toggle.Root>
      );
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
    );
  }
);

Button.displayName = 'Button';

export default Button;
