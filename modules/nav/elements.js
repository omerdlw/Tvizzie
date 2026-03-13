import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Iconify from '@/ui/icon'

export const Description = ({ text, style }) => {
  const { className, opacity, ...restStyle } = style || {}
  const defaultOpacity = opacity ?? 0.7

  return (
    <div className="relative h-auto w-full">
      <AnimatePresence mode="wait">
        <motion.p
          className={cn('truncate text-sm', className)}
          transition={{
            ease: EASING.SMOOTH,
            duration: DURATION.FAST,
          }}
          style={restStyle}
          animate={{ opacity: defaultOpacity, y: 0 }}
          initial={{ opacity: 0, y: 8 }}
          exit={{ opacity: 0, y: -8 }}
          key={text}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

export const Icon = ({ icon, isStackHovered, style }) => {
  const isUrl = typeof icon === 'string' && icon.startsWith('http')
  const { size: iconSize = 24, ...iconStyle } = style || {}
  const hasCustomBackground =
    Object.prototype.hasOwnProperty.call(iconStyle, 'background') ||
    Object.prototype.hasOwnProperty.call(iconStyle, 'backgroundColor')
  const hasCustomColor = Object.prototype.hasOwnProperty.call(
    iconStyle,
    'color'
  )

  if (isUrl) {
    const cleanedStyle = { ...iconStyle }
    delete cleanedStyle.background
    delete cleanedStyle.backgroundImage
    return (
      <motion.div
        className="size-12 shrink-0 rounded-[20px] bg-cover bg-center bg-no-repeat"
        transition={{ duration: DURATION.FAST, ease: EASING.SMOOTH }}
        style={{ ...cleanedStyle, backgroundImage: `url(${icon})` }}
      />
    )
  }

  return (
    <motion.div
      className={cn(
        'flex size-12 items-center justify-center rounded-[20px] bg-white/5 transition-colors duration-300',
        isStackHovered && !hasCustomBackground && 'bg-white/10',
        isStackHovered && !hasCustomColor && 'text-white'
      )}
      transition={{ duration: 0.25, ease: EASING.SMOOTH }}
      style={iconStyle}
    >
      <motion.span transition={{ duration: DURATION.FAST }}>
        {typeof icon === 'string' ? (
          <Iconify size={iconSize} icon={icon} />
        ) : (
          icon
        )}
      </motion.span>
    </motion.div>
  )
}

export const Title = ({ text, style }) => {
  const { className, ...restStyle } = style || {}
  return (
    <h3
      className={cn('truncate font-bold uppercase', className)}
      style={restStyle}
    >
      {text}
    </h3>
  )
}
