'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDraggableScroll } from '@/shared';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

function defaultGetKey(item) {
  return item?.key;
}

function defaultGetLabel(item) {
  return item?.label;
}

function defaultGetIcon(item) {
  return item?.icon;
}

const DEFAULT_PADDING = 3;

export default function SegmentedControl({
  ariaLabel,
  className = '',
  classNames = {},
  getLabel = defaultGetLabel,
  getKey = defaultGetKey,
  getIcon = defaultGetIcon,
  items = [],
  onChange,
  value,
  renderPrefix,
  renderSuffix,
  fullWidth = false,
  iconSize: customIconSize,
}) {
  const wrapperRef = useRef(null);
  const buttonRefs = useRef(new Map());
  const trackRef = useDraggableScroll();
  const [indicator, setIndicator] = useState(null);

  const resolvedItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const iconSize = customIconSize ?? 14;
  const padding = DEFAULT_PADDING;
  const roundedClasses = {
    wrapper: 'rounded-[13px]',
    track: 'rounded-[10px]',
    innerWrapper: 'rounded-[10px]',
    indicator: 'rounded-[10px]',
    button: 'rounded-[10px]',
  };

  const activeItemKey = useMemo(() => {
    if (!resolvedItems.length) {
      return null;
    }
    const fallbackItem = resolvedItems[0];
    const activeKey = value ?? getKey(fallbackItem);
    return getKey(resolvedItems.find((item) => getKey(item) === activeKey) || fallbackItem);
  }, [getKey, resolvedItems, value]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const activeButton = buttonRefs.current.get(activeItemKey);

    if (!wrapper || !activeButton) {
      setIndicator(null);
      return undefined;
    }

    const update = () => {
      const x = activeButton.offsetLeft;
      const w = activeButton.offsetWidth;

      if (w === 0) return;

      setIndicator((prev) => {
        if (prev && prev._x === x && prev._w === w) {
          return prev;
        }
        return {
          _x: x,
          _w: w,
          ready: Boolean(prev),
        };
      });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    ro.observe(activeButton);
    return () => ro.disconnect();
  }, [activeItemKey, resolvedItems]);

  useEffect(() => {
    const activeButton = buttonRefs.current.get(activeItemKey);
    const track = trackRef.current;
    if (!activeButton || !track) {
      return;
    }

    const trackWidth = track.clientWidth;
    const scrollLeft = track.scrollLeft;
    const buttonLeft = activeButton.offsetLeft;
    const buttonWidth = activeButton.offsetWidth;

    if (buttonLeft < scrollLeft) {
      track.scrollTo({ left: buttonLeft - 16, behavior: 'smooth' });
    } else if (buttonLeft + buttonWidth > scrollLeft + trackWidth) {
      track.scrollTo({ left: buttonLeft + buttonWidth - trackWidth + 16, behavior: 'smooth' });
    }
  }, [activeItemKey, trackRef]);

  if (!resolvedItems.length) {
    return null;
  }

  const defaultButtonPadding = 'px-3 py-1 text-xs';
  const defaultIndicatorBg = 'bg-white/10 shadow-sm';
  const defaultWrapperBg = 'ring-1 ring-inset ring-white/5 bg-white/5 shadow-inner';

  return (
    <div
      aria-label={ariaLabel}
      role={ariaLabel ? 'group' : undefined}
      style={{ padding: `${padding}px` }}
      className={cn(
        fullWidth
          ? 'flex w-full items-stretch'
          : 'inline-flex w-fit max-w-full shrink-0 items-stretch',
        'overflow-hidden',
        defaultWrapperBg,
        roundedClasses.wrapper,
        className,
        classNames.wrapper,
      )}
    >
      <div
        ref={trackRef}
        onDragStart={(event) => event.preventDefault()}
        className={cn(
          'hide-scrollbar h-full max-w-full cursor-grab touch-pan-x overflow-x-auto select-none',
          fullWidth ? 'flex w-full' : '',
          roundedClasses.track,
          classNames.track,
        )}
      >
        <div
          ref={wrapperRef}
          className={cn(
            'relative flex h-full items-stretch overflow-hidden',
            fullWidth ? 'w-full flex-1' : 'w-max',
            roundedClasses.innerWrapper,
            classNames.innerWrapper,
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0',
              defaultIndicatorBg,
              roundedClasses.indicator,
              classNames.indicator,
            )}
            style={{
              ...(indicator
                ? {
                    transform: `translateX(${indicator._x}px)`,
                    width: `${indicator._w}px`,
                    transition: indicator.ready
                      ? 'transform 200ms cubic-bezier(0.19, 1, 0.22, 1), width 200ms cubic-bezier(0.19, 1, 0.22, 1)'
                      : 'none',
                  }
                : { width: 0, opacity: 0 }),
            }}
          />

          {resolvedItems.map((item) => {
            const itemKey = getKey(item);
            const isActive = activeItemKey === itemKey;
            const iconName = getIcon(item);

            return (
              <Button
                key={itemKey}
                type="button"
                ref={(node) => {
                  if (node) {
                    buttonRefs.current.set(itemKey, node);
                    return;
                  }
                  buttonRefs.current.delete(itemKey);
                }}
                onClick={() => onChange?.(itemKey)}
                className={cn(
                  'relative isolate z-10 cursor-pointer appearance-none bg-transparent whitespace-nowrap ring-0 transition-colors duration-200',
                  fullWidth ? 'flex-1 justify-center' : '',
                  defaultButtonPadding,
                  roundedClasses.button,
                  isActive
                    ? classNames.active || 'font-bold text-white'
                    : classNames.inactive || 'text-white/70 hover:text-white',
                  classNames.button,
                )}
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
                  {typeof renderPrefix === 'function' ? (
                    renderPrefix(item, isActive)
                  ) : iconName ? (
                    <Icon
                      icon={iconName}
                      size={iconSize}
                      className={cn(
                        'shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-white/70',
                      )}
                    />
                  ) : null}
                  {getLabel(item)}
                  {typeof renderSuffix === 'function' ? renderSuffix(item, isActive) : null}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
