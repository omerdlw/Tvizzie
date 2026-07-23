import { cn } from '@/core/utils/classnames';
import Iconify from '@/ui/icon';

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
    <div className="relative w-full text-sm">
      <p
        className={cn(
          'text-black',
          isMultiline ? 'wrap-break-word whitespace-normal' : 'truncate',
          className,
        )}
        style={{ opacity, ...getLineClampStyle(maxLines, restStyle) }}
      >
        {text}
      </p>
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
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick?.(event);
      }}
      title={title || undefined}
      aria-label={title || 'Open current account'}
      className={cn(
        'absolute -right-1 -bottom-1 rounded-[8px] flex size-6 items-center justify-center overflow-hidden ',
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
    </button>
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
            'size-12 shrink-0 rounded-[16px] bg-cover bg-center bg-no-repeat',
            className,
          )}
          style={getImageIconStyle(iconStyle, icon)}
        />
      ) : (
        <div
          className={cn(
            'center size-12 rounded-[16px] bg-black/5',
            isStackHovered && !hasCustomBackground && 'bg-black/10',
            isStackHovered && !hasCustomColor && 'text-black',
            className,
          )}
          style={iconStyle}
        >
          <span>
            {renderIconNode(icon, size)}
          </span>
        </div>
      )}
      <IconOverlay overlay={iconOverlay} />
    </div>
  );
}

export function Title({ text, style }) {
  const { className, inlineStyle } = splitStyle(style);

  return (
    <div className="relative overflow-hidden">
      <h3
        className={cn('truncate font-bold uppercase', className)}
        style={inlineStyle}
      >
        {text}
      </h3>
    </div>
  );
}
