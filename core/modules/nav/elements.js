import { motion, AnimatePresence } from 'framer-motion';
import Iconify from '@/ui/icon';
import {
  NAV_FADE_TRANSITION,
  NAV_BADGE_TRANSITION,
  textCrossfadeVariants,
} from '@/core/modules/nav/motion';
import { cn } from '@/core/utils';

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' &&
    (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
}

function splitStyle(style = {}) {
  const { className, ...inlineStyle } = style;
  return {
    className,
    inlineStyle,
  };
}

function getLineClampStyle(maxLines, style) {
  if (Number(maxLines) <= 1) {
    return style;
  }

  return {
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: maxLines,
    display: '-webkit-box',
    overflow: 'hidden',
    ...style,
  };
}

export function Description({ text, style, maxLines = 1 }) {
  const { className, inlineStyle } = splitStyle(style);
  const { opacity = 0.7, ...restStyle } = inlineStyle;
  const isMultiline = Number(maxLines) > 1;

  return (
    <div className="relative w-full text-sm overflow-hidden min-h-[1.25rem]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={typeof text === 'string' || typeof text === 'number' ? text : 'desc'}
          variants={textCrossfadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            'text-black',
            isMultiline ? 'wrap-break-word whitespace-normal' : 'truncate',
            className,
          )}
          style={{ opacity, ...getLineClampStyle(maxLines, restStyle) }}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function renderIconNode(icon, size) {
  return typeof icon === 'string' ? <Iconify icon={icon} size={size} /> : icon;
}

function IconOverlay({ overlay }) {
  if (!overlay?.icon) {
    return null;
  }

  const { icon, onClick, title = '' } = overlay;
  const isImageSource = isImageIconSource(icon);

  return (
    <AnimatePresence mode="popLayout">
      <motion.button
        key={icon}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onClick?.(event);
        }}
        title={title || undefined}
        aria-label={title || 'Open current account'}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.7 }}
        whileTap={onClick ? { scale: 0.9 } : undefined}
        transition={NAV_BADGE_TRANSITION}
        className={cn(
          'absolute -right-1 -bottom-1 rounded-[8px] flex size-6 items-center justify-center overflow-hidden',
          typeof onClick === 'function' ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        {isImageSource ? (
          <span
            className="size-full rounded-[8px] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${icon})` }}
          />
        ) : (
          <span className="text-black">{renderIconNode(icon, 12)}</span>
        )}
      </motion.button>
    </AnimatePresence>
  );
}

function getIconStyleFlags(style = {}) {
  return {
    hasCustomBackground:
      Object.prototype.hasOwnProperty.call(style, 'background') ||
      Object.prototype.hasOwnProperty.call(style, 'backgroundColor'),
    hasCustomColor: Object.prototype.hasOwnProperty.call(style, 'color'),
  };
}

function getImageIconStyle(style, icon) {
  const nextStyle = { ...style };
  delete nextStyle.background;
  delete nextStyle.backgroundImage;

  return {
    ...nextStyle,
    backgroundImage: `url(${icon})`,
  };
}

export function Icon({ icon, iconOverlay = null, isStackHovered, style }) {
  const { className, inlineStyle } = splitStyle(style);
  const { size = 24, ...iconStyle } = inlineStyle;
  const isImageSource = isImageIconSource(icon);
  const { hasCustomBackground, hasCustomColor } = getIconStyleFlags(iconStyle);

  return (
    <div className="relative">
      {isImageSource ? (
        <div
          className={cn(
            'size-12 shrink-0 rounded-2xl bg-cover bg-center bg-no-repeat',
            className,
          )}
          style={getImageIconStyle(iconStyle, icon)}
        />
      ) : (
        <motion.div
          className={cn(
            'center size-12 rounded-2xl',
            className,
          )}
          animate={{
            backgroundColor:
              isStackHovered && !hasCustomBackground
                ? 'rgba(0,0,0,0.10)'
                : 'rgba(0,0,0,0.05)',
            color:
              isStackHovered && !hasCustomColor
                ? 'rgba(0,0,0,1)'
                : undefined,
          }}
          transition={NAV_FADE_TRANSITION}
          style={iconStyle}
        >
          <span>
            {renderIconNode(icon, size)}
          </span>
        </motion.div>
      )}
      <IconOverlay overlay={iconOverlay} />
    </div>
  );
}

export function Title({ text, style }) {
  const { className, inlineStyle } = splitStyle(style);

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.h3
          key={typeof text === 'string' || typeof text === 'number' ? text : 'title'}
          variants={textCrossfadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn('truncate font-bold', className)}
          style={inlineStyle}
        >
          {text}
        </motion.h3>
      </AnimatePresence>
    </div>
  );
}
