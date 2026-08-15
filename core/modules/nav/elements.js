import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import {
  NAV_BADGE_TRANSITION,
  NAV_FADE_TRANSITION,
  NAV_TAP_SCALE,
  textCrossfadeVariants,
} from '@/modules/nav/motion';
import { cn } from '@/shared/utils';
import Iconify from '@/ui/primitives/icon';

// --- HELPER FUNCTIONS ---

function isImageIconSource(icon) {
  return (
    typeof icon === 'string' &&
    (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
}

function splitStyle(style = {}) {
  const { className, ...inlineStyle } = style;
  return { className, inlineStyle };
}

function getLineClampStyle(maxLines, style) {
  if (Number(maxLines) <= 1) return style;

  return {
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: maxLines,
    display: '-webkit-box',
    overflow: 'hidden',
    ...style,
  };
}

function renderIconNode(icon, size) {
  return typeof icon === 'string' ? <Iconify icon={icon} size={size} /> : icon;
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

// --- COMPONENTS ---

export const Description = memo(function Description({ text, style, maxLines = 1 }) {
  const { className, inlineStyle } = splitStyle(style);
  const { opacity = 0.7, ...restStyle } = inlineStyle;
  const isMultiline = Number(maxLines) > 1;
  const targetOpacity = typeof opacity === 'number' ? opacity : 0.7;

  return (
    <div className="relative min-h-[1.25rem] w-full overflow-hidden text-sm">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={typeof text === 'string' || typeof text === 'number' ? text : 'desc'}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: targetOpacity, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={NAV_FADE_TRANSITION}
          className={cn(
            isMultiline ? 'wrap-break-word whitespace-normal' : 'truncate',
            'text-white',
            className,
          )}
          style={{ opacity: targetOpacity, ...getLineClampStyle(maxLines, restStyle) }}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
});

export const IconOverlay = memo(function IconOverlay({ overlay }) {
  if (!overlay?.icon) return null;

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
        initial={{ opacity: 0, scale: 0.6, y: 2 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.6, y: 2 }}
        whileTap={onClick ? { scale: NAV_TAP_SCALE } : undefined}
        transition={NAV_BADGE_TRANSITION}
        className={cn(
          'absolute -right-1 -bottom-1 flex size-6 items-center justify-center overflow-hidden',
          typeof onClick === 'function' ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        {isImageSource ? (
          <span
            className="size-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${icon})` }}
          />
        ) : (
          <span className="text-white">{renderIconNode(icon, 12)}</span>
        )}
      </motion.button>
    </AnimatePresence>
  );
});

export const Icon = memo(function Icon({ icon, iconOverlay = null, isStackHovered, style }) {
  const { className, inlineStyle } = splitStyle(style);
  const { size = 24, ...iconStyle } = inlineStyle;
  const isImageSource = isImageIconSource(icon);

  const hasCustomBackground =
    'background' in iconStyle ||
    'backgroundColor' in iconStyle ||
    Boolean(className && /(?:^|\s)bg-/.test(className));
  const hasCustomColor =
    'color' in iconStyle || Boolean(className && /(?:^|\s)text-/.test(className));

  return (
    <div className="relative">
      {isImageSource ? (
        <motion.div
          className={cn('size-12 shrink-0 bg-cover bg-center bg-no-repeat', className)}
          style={getImageIconStyle(iconStyle, icon)}
          animate={{ scale: isStackHovered ? 1.04 : 1 }}
          transition={NAV_FADE_TRANSITION}
        />
      ) : (
        <motion.div
          className={cn('center size-12', className)}
          animate={{
            scale: isStackHovered ? 1.04 : 1,
            backgroundColor: hasCustomBackground
              ? undefined
              : isStackHovered
                ? 'rgba(252,252,251,0.10)'
                : 'rgba(252,252,251,0.05)',
            color: hasCustomColor ? undefined : isStackHovered ? 'rgba(252,252,251,1)' : undefined,
          }}
          transition={NAV_FADE_TRANSITION}
          style={iconStyle}
        >
          <span>{renderIconNode(icon, size)}</span>
        </motion.div>
      )}
      <IconOverlay overlay={iconOverlay} />
    </div>
  );
});

export const Title = memo(function Title({ text, style }) {
  const { className, inlineStyle } = splitStyle(style);

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.h3
          key={typeof text === 'string' || typeof text === 'number' ? text : 'title'}
          className={cn('truncate font-bold', className)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={NAV_FADE_TRANSITION}
          style={inlineStyle}
        >
          {text}
        </motion.h3>
      </AnimatePresence>
    </div>
  );
});
