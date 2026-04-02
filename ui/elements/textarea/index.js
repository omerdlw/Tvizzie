'use client'

import { forwardRef, useCallback, useEffect, useRef } from 'react'

import { cn, resolveSlotClasses } from '../utils'

const Textarea = forwardRef(
  (
    {
      className,
      classNames = {},
      maxHeight,
      maxWidth,
      value,
      onChange,
      autoCapitalize = 'none',
      autoCorrect = 'off',
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef(null)
    const classes = resolveSlotClasses(className, classNames)

    const setTextareaRef = useCallback(
      (node) => {
        textareaRef.current = node

        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      textarea.style.height = 'auto'

      const newHeight = textarea.scrollHeight
      const constrainedHeight = maxHeight
        ? Math.min(newHeight, maxHeight)
        : newHeight

      textarea.style.height = `${constrainedHeight}px`
    }, [value, maxHeight])

    const inlineStyles = {
      ...(maxHeight && { maxHeight: `${maxHeight}px` }),
      ...(maxWidth && { maxWidth: `${maxWidth}px` }),
    }

    return (
      <div className={cn('w-full', classes.wrapper)}>
        <textarea
          ref={setTextareaRef}
          value={value}
          onChange={onChange}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          className={cn(
            'w-full resize bg-transparent',
            classes.textarea,
            classes.root
          )}
          style={inlineStyles}
          {...props}
        />
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea
