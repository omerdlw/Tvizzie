'use client';

import { useId } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/core/utils';

function defaultGetKey(item) {
  return item?.key;
}

function defaultGetLabel(item) {
  return item?.label;
}

export default function SegmentedControl({
  classNames = {},
  getLabel = defaultGetLabel,
  getKey = defaultGetKey,
  items = [],
  onChange,
  value,
  renderSuffix,
}) {
  const instanceId = useId();
  const reduceMotion = useReducedMotion();

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      <div className={cn('hide-scrollbar w-full overflow-x-auto', classNames.track)}>
        <div
          className={cn(
            'relative flex min-w-full items-stretch gap-1 border border-black/5 bg-black/5',
            'p-1',
            classNames.wrapper
          )}
        >
          {items.map((item) => {
            const itemKey = getKey(item);
            const isActive = value === itemKey;

            return (
              <motion.button
                key={itemKey}
                type="button"
                onClick={() => onChange?.(itemKey)}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                className={cn(
                  'relative isolate z-10 cursor-pointer px-3 py-1 text-[11px]! font-medium whitespace-nowrap transition-colors duration-(--motion-duration-fast)',
                  isActive ? classNames.active || 'text-black' : classNames.inactive || 'text-black/70',
                  classNames.button
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId={`${instanceId}-segmented-active-indicator`}
                    className={cn('absolute inset-0', classNames.indicator || 'bg-primary')}
                    transition={
                      reduceMotion ? { duration: 0.12 } : { type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }
                    }
                  />
                ) : null}
                <span className="relative z-10 inline-flex items-center gap-1">
                  {getLabel(item)}
                  {typeof renderSuffix === 'function' ? renderSuffix(item) : null}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
