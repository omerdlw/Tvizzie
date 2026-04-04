'use client';

import { forwardRef, useMemo } from 'react';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';

import { Z_INDEX } from '@/core/constants';

import Checkbox from '../checkbox';
import { cn, resolveNestedClassName, resolveSlotClasses, useSelect } from '../utils';

const MultiSelect = forwardRef(
  (
    {
      options = [],
      value = [],
      onChange,
      maxSelect,
      checkboxPosition = 'left',
      placeholder = 'Select',
      className,
      classNames = {},
      externalClasses = {},
      disabled = false,
    },
    ref
  ) => {
    const {
      value: selectedValues,
      isOpen,
      handleSelect,
      handleOpenChange,
    } = useSelect({
      value,
      onChange,
      defaultValue: [],
      multiple: true,
    });
    const classes = resolveSlotClasses(className, classNames);
    const checkboxClassName = resolveNestedClassName(classes, 'checkbox', externalClasses.checkbox || {});

    const selectedLabels = useMemo(() => {
      return options
        .filter((opt) => selectedValues.includes(opt.value))
        .map((opt) => opt.label)
        .join(', ');
    }, [options, selectedValues]);

    const isMaxReached = maxSelect && selectedValues.length >= maxSelect;

    return (
      <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Trigger
          ref={ref}
          className={cn(classes.value, classes.trigger, classes.root)}
          disabled={disabled}
          asChild
        >
          <button type="button" className={cn('inline-flex items-center')}>
            <span>{selectedLabels || placeholder}</span>
            <ChevronDown size={16} className={cn(classes.icon)} />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content className={cn(classes.menu)} align="start" style={{ zIndex: Z_INDEX.SELECT }}>
            <div className={cn(classes.optionsList)}>
              {options.map((option) => {
                const isChecked = selectedValues.includes(option.value);
                const isDisabled = !isChecked && isMaxReached;

                return (
                  <div
                    key={option.value}
                    className={cn(
                      classes.option,
                      isChecked && classes.optionActive,
                      isDisabled && classes.optionDisabled,
                      'flex cursor-pointer items-center',
                      checkboxPosition === 'right' && 'flex-row-reverse justify-between'
                    )}
                    onClick={() => !isDisabled && handleSelect(option.value)}
                  >
                    <Checkbox checked={isChecked} disabled={isDisabled} className={checkboxClassName} />
                    <span className={cn(classes.optionLabel)}>{option.label}</span>
                  </div>
                );
              })}
            </div>

            {maxSelect && (
              <div className={cn(classes.footer)}>
                Selected: {selectedValues.length}/{maxSelect}
              </div>
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';

export default MultiSelect;
