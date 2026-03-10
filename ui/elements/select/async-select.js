'use client'

import { forwardRef, useEffect, useState } from 'react'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, ChevronDown, Loader2 } from 'lucide-react'

import { Z_INDEX } from '@/lib/constants'

import Input from '../input'
import { cn, resolveNestedClassName, resolveSlotClasses } from '../utils'

const AsyncSelect = forwardRef(
  (
    {
      loadOptions,
      debounceMs = 300,
      value,
      onChange,
      placeholder = 'Select...',
      searchPlaceholder = 'Type to search...',
      className,
      classNames = {},
      externalClasses = {},
      disabled = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [options, setOptions] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const classes = resolveSlotClasses(className, classNames)
    const inputClassName = resolveNestedClassName(
      classes,
      'input',
      externalClasses.input || {}
    )

    const selectedOption = options.find((opt) => opt.value === value)

    useEffect(() => {
      if (!isOpen || !loadOptions) return

      let isCancelled = false
      const timeoutId = setTimeout(async () => {
        setIsLoading(true)
        try {
          const results = await loadOptions(searchQuery)
          if (!isCancelled) {
            setOptions(results || [])
          }
        } catch (error) {
          console.error('Error loading options:', error)
          if (!isCancelled) {
            setOptions([])
          }
        } finally {
          if (!isCancelled) {
            setIsLoading(false)
          }
        }
      }, debounceMs)

      return () => {
        isCancelled = true
        clearTimeout(timeoutId)
      }
    }, [isOpen, searchQuery, loadOptions, debounceMs])

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
              {isLoading ? (
                <div className={cn(classes.loading, externalClasses.loading)}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : options.length === 0 ? (
                <div className={cn(classes.noResults)}>
                  {searchQuery ? 'No results found' : 'Start typing to search'}
                </div>
              ) : (
                options.map((option) => (
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

AsyncSelect.displayName = 'AsyncSelect'

export default AsyncSelect
