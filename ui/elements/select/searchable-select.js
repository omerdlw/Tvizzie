'use client'

import { forwardRef, useMemo, useState } from 'react'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, ChevronDown } from 'lucide-react'

import { Z_INDEX } from '@/lib/constants'

import Input from '../input'
import {
  cn,
  filterOptions,
  resolveNestedClassName,
  resolveSlotClasses,
} from '../utils'

const SearchableSelect = forwardRef(
  (
    {
      options = [],
      value,
      onChange,
      placeholder = 'Select',
      searchPlaceholder = 'Search',
      filterFn,
      className,
      classNames = {},
      externalClasses = {},
      disabled = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const classes = resolveSlotClasses(className, classNames)
    const inputClassName = resolveNestedClassName(
      classes,
      'input',
      externalClasses.input || {}
    )

    const selectedOption = options.find((opt) => opt.value === value)

    const filteredOptions = useMemo(() => {
      return filterOptions(options, searchQuery, filterFn)
    }, [options, searchQuery, filterFn])

    const handleSelect = (selectedValue) => {
      onChange?.(selectedValue)
      setIsOpen(false)
      setSearchQuery('')
    }

    return (
      <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <PopoverPrimitive.Trigger
          ref={ref}
          className={cn(classes.value, classes.trigger, classes.root)}
          disabled={disabled}
          asChild
        >
          <button type="button" className={cn('inline-flex items-center')}>
            <span>{selectedOption?.label || placeholder}</span>
            <ChevronDown size={16} className={cn(classes.icon)} />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className={cn(classes.menu)}
            align="start"
            style={{ zIndex: Z_INDEX.SELECT }}
          >
            <div className={cn(classes.searchWrapper)}>
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={inputClassName}
                autoFocus
              />
            </div>

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
                    {value === option.value && (
                      <Check size={16} className={cn(classes.indicator)} />
                    )}
                  </div>
                ))
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  }
)

SearchableSelect.displayName = 'SearchableSelect'

export default SearchableSelect
