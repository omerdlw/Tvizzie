import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING } from '@/core/constants'
import { cn } from '@/core/utils'
import Iconify from '@/ui/icon'

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' &&
    (icon.startsWith('http') ||
      icon.startsWith('/') ||
      icon.startsWith('data:image/'))
  )
}

function splitStyle(style = {}) {
  const { className, ...inlineStyle } = style
  return {
    className,
    inlineStyle,
  }
}

function getDescriptionAnimation() {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: {
      duration: DURATION.FAST,
      ease: EASING.SMOOTH,
    },
  }
}

function getLineClampStyle(maxLines, style) {
  if (Number(maxLines) <= 1) {
    return style
  }

  return {
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: maxLines,
    display: '-webkit-box',
    overflow: 'hidden',
    ...style,
  }
}

export function Description({ text, style, maxLines = 1 }) {
  const { className, inlineStyle } = splitStyle(style)
  const { opacity = 0.7, ...restStyle } = inlineStyle
  const isMultiline = Number(maxLines) > 1

  return (
    <div className="relative w-full text-sm">
      <AnimatePresence mode="wait">
        <motion.p
          className={cn(
            isMultiline ? 'wrap-break-word whitespace-normal' : 'truncate',
            className
          )}
          animate={{ ...getDescriptionAnimation().animate, opacity }}
          transition={getDescriptionAnimation().transition}
          style={getLineClampStyle(maxLines, restStyle)}
          initial={getDescriptionAnimation().initial}
          exit={getDescriptionAnimation().exit}
          key={typeof text === 'string' || typeof text === 'number' ? text : undefined}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

function getIconStyleFlags(style = {}) {
  return {
    hasCustomBackground:
      Object.prototype.hasOwnProperty.call(style, 'background') ||
      Object.prototype.hasOwnProperty.call(style, 'backgroundColor'),
    hasCustomColor: Object.prototype.hasOwnProperty.call(style, 'color'),
  }
}

function getImageIconStyle(style, icon) {
  const nextStyle = { ...style }
  delete nextStyle.background
  delete nextStyle.backgroundImage

  return {
    ...nextStyle,
    backgroundImage: `url(${icon})`,
  }
}

export function Icon({ icon, isStackHovered, style }) {
  const { className, inlineStyle } = splitStyle(style)
  const { size = 24, ...iconStyle } = inlineStyle
  const isImageSource = isImageIconSource(icon)
  const { hasCustomBackground, hasCustomColor } = getIconStyleFlags(iconStyle)

  if (isImageSource) {
    return (
      <motion.div
        className={cn(
          'size-12 shrink-0 bg-cover bg-center bg-no-repeat rounded-[12px]',
          className
        )}
        transition={{ duration: DURATION.FAST, ease: EASING.SMOOTH }}
        style={getImageIconStyle(iconStyle, icon)}
      />
    )
  }

  return (
    <motion.div
      className={cn(
        'center size-12 bg-white/5 rounded-[12px] transition-colors duration-(--motion-duration-normal)',
        isStackHovered && !hasCustomBackground && 'bg-white/10',
        isStackHovered && !hasCustomColor && 'text-white',
        className
      )}
      style={iconStyle}
      transition={{ duration: DURATION.SNAPPY, ease: EASING.SMOOTH }}
    >
      <motion.span transition={{ duration: DURATION.FAST }}>
        {typeof icon === 'string' ? <Iconify icon={icon} size={size} /> : icon}
      </motion.span>
    </motion.div>
  )
}

export function Title({ text, style }) {
  const { className, inlineStyle } = splitStyle(style)

  return (
    <h3
      className={cn('truncate font-bold uppercase', className)}
      style={inlineStyle}
    >
      {text}
    </h3>
  )
}
