import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/core/utils/classnames';
import Iconify from '@/ui/icon';

import {
  getNavDescriptionAnimate,
  NAV_CONTENT_TRANSITION,
  NAV_DESCRIPTION_MOTION,
  NAV_ICON_OVERLAY_MOTION,
  NAV_MICRO_SPRING,
} from '@/core/modules/motion';

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
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
    <div className="relative w-full text-xs sm:text-sm">
      <AnimatePresence initial={false} mode="wait">
        <motion.p
          className={cn('text-black', isMultiline ? 'wrap-break-word whitespace-normal' : 'truncate', className)}
          animate={getNavDescriptionAnimate(opacity)}
          transition={NAV_DESCRIPTION_MOTION.transition}
          style={getLineClampStyle(maxLines, restStyle)}
          initial={NAV_DESCRIPTION_MOTION.initial}
          exit={NAV_DESCRIPTION_MOTION.exit}
          key={typeof text === 'string' || typeof text === 'number' ? text : undefined}
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
    <motion.button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick?.(event);
      }}
      title={title || undefined}
      aria-label={title || 'Open current account'}
      className={cn(
        'absolute -right-1 -bottom-1 flex size-6 items-center justify-center overflow-hidden',
        typeof onClick === 'function' ? 'cursor-pointer' : 'cursor-default'
      )}
      {...NAV_ICON_OVERLAY_MOTION}
    >
      {isImageSource ? (
        <span className="size-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${icon})` }} />
      ) : (
        <span className="text-black">{renderIconNode(icon, 12)}</span>
      )}
    </motion.button>
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
        <motion.div
          className={cn('size-10 shrink-0 bg-cover bg-center bg-no-repeat sm:size-12', className)}
          transition={NAV_CONTENT_TRANSITION}
          style={getImageIconStyle(iconStyle, icon)}
        />
      ) : (
        <motion.div
          className={cn(
            'center size-10 bg-black/5 transition-colors duration-[300ms] sm:size-12',
            isStackHovered && !hasCustomBackground && 'bg-black/10',
            isStackHovered && !hasCustomColor && 'text-black',
            className
          )}
          style={iconStyle}
          transition={NAV_MICRO_SPRING}
        >
          <motion.span transition={NAV_CONTENT_TRANSITION}>{renderIconNode(icon, size)}</motion.span>
        </motion.div>
      )}
      <IconOverlay overlay={iconOverlay} />
    </div>
  );
}

export function Title({ text, style }) {
  const { className, inlineStyle } = splitStyle(style);

  return (
    <h3 className={cn('truncate font-bold uppercase', className)} style={inlineStyle}>
      {text}
    </h3>
  );
}
