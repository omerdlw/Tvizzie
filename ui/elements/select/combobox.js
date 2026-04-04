'use client';

import { forwardRef, useMemo, useState } from 'react';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check } from 'lucide-react';

import { Z_INDEX } from '@/core/constants';

import Input from '../input';
import { cn, filterOptions, resolveNestedClassName, resolveSlotClasses } from '../utils';

const Combobox = forwardRef(
  (
    {
      options = [],
      value,
      onChange,
      placeholder = 'Type to search',
      filterFn,
      className,
      classNames = {},
      externalClasses = {},
      disabled = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const classes = resolveSlotClasses(className, classNames);
    const inputClassName = resolveNestedClassName(classes, 'input', externalClasses.input || {});

    const selectedOption = options.find((opt) => opt.value === value);

    const displayValue = !isOpen && selectedOption ? selectedOption.label : inputValue;

    const filteredOptions = useMemo(() => {
      return filterOptions(options, inputValue, filterFn);
    }, [options, inputValue, filterFn]);

    const handleSelect = (selectedValue) => {
      const option = options.find((opt) => opt.value === selectedValue);
      onChange?.(selectedValue);
      setInputValue(option?.label || '');
      setIsOpen(false);
    };

    const handleInputChange = (e) => {
      setInputValue(e.target.value);
      if (!isOpen) {
        setIsOpen(true);
      }
    };

    const handleOpenChange = (open) => {
      setIsOpen(open);
      if (!open && selectedOption) {
        setInputValue(selectedOption.label);
      }
    };

    return (
      <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Trigger
          ref={ref}
          className={cn(classes.value, classes.trigger, classes.root)}
          disabled={disabled}
          asChild
        >
          <div>
            <Input
              type="text"
              placeholder={placeholder}
              value={displayValue}
              onChange={handleInputChange}
              onFocus={() => setIsOpen(true)}
              className={inputClassName}
              disabled={disabled}
            />
          </div>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content className={cn(classes.menu)} align="start" style={{ zIndex: Z_INDEX.SELECT }}>
            <div className={cn(classes.optionsList)}>
              {filteredOptions.length === 0 ? (
                <div className={cn(classes.noResults)}>No results found</div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      classes.option,
                      value === option.value && classes.optionActive,
                      'flex cursor-pointer items-center'
                    )}
                  >
                    <span>{option.label}</span>
                    {value === option.value && <Check size={16} className={cn(classes.indicator)} />}
                  </div>
                ))
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);

Combobox.displayName = 'Combobox';

export default Combobox;
