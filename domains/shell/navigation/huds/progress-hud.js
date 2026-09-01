'use client';

import { memo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { NAV_HUD_PRIORITY, useNavHud } from '@/modules/nav';
import { NAV_MICRO_TRANSITION } from '@/modules/nav';
import { cn } from '@/ui/class-names';
import { Button, Tooltip } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

function normalizeProgress(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return Math.round(Math.max(0, Math.min(100, numericValue)));
}

export const ProgressHud = memo(function ProgressHud({
  title = 'Processing...',
  description = null,
  progress = null,
  isIndeterminate = false,
  icon = 'solar:refresh-circle-bold',
  actions = [],
  onCancel = null,
  canCancel = false,
}) {
  const reducedMotion = useReducedMotion();
  const normalizedProgress = normalizeProgress(progress);
  const isDeterminate = !isIndeterminate && normalizedProgress != null;
  const isInProgress = isIndeterminate || (isDeterminate && normalizedProgress < 100);
  const statusLabel = isDeterminate ? `${normalizedProgress}%` : isInProgress ? 'Uploading' : null;
  const shouldShowProgress = isIndeterminate || isDeterminate;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={isInProgress}
      className="flex w-full flex-col gap-2.5"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 bg-white/10 text-white">
          {typeof icon === 'string' ? <Icon icon={icon} size={18} /> : icon}
          {isInProgress ? (
            <span
              aria-hidden="true"
              className="bg-info absolute top-0 right-0 size-2 animate-pulse rounded-full ring-1 ring-inset ring-black/80 motion-reduce:animate-none"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="truncate text-sm leading-tight font-semibold text-white">{title}</p>
            {statusLabel ? (
              <span className="shrink-0 text-xs font-medium text-white/70">{statusLabel}</span>
            ) : null}
          </div>
          {description ? (
            <p className="truncate pt-0.5 text-xs leading-tight text-white/70">{description}</p>
          ) : null}
        </div>

        {(actions.length > 0 || (canCancel && typeof onCancel === 'function')) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {actions.map((action, index) => {
              const actionKey = action.key || `progress-hud-action-${index}`;
              const isDestructive = Boolean(action.isDestructive);

              return (
                <Tooltip key={actionKey} text={action.tooltip || action.label}>
                  <Button
                    type="button"
                    disabled={action.disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      action.onClick?.(event);
                    }}
                    className={cn(
                      'flex h-8 items-center gap-1.5 rounded-xl ring-1 ring-inset px-2.5 text-xs font-medium',
                      isDestructive
                        ? 'ring-red-500/20 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white',
                      action.disabled && 'pointer-events-none opacity-40',
                    )}
                    aria-label={action.label}
                  >
                    {action.icon ? <Icon icon={action.icon} size={15} /> : null}
                    {action.label ? <span>{action.label}</span> : null}
                  </Button>
                </Tooltip>
              );
            })}

            {canCancel && typeof onCancel === 'function' ? (
              <Tooltip text="Cancel upload">
                <Button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCancel(event);
                  }}
                  className="flex size-8 items-center justify-center rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white"
                  aria-label="Cancel upload"
                >
                  <Icon icon="solar:close-circle-bold" size={16} />
                </Button>
              </Tooltip>
            ) : null}
          </div>
        )}
      </div>

      {shouldShowProgress ? (
        <div
          role="progressbar"
          aria-label={title}
          aria-valuemin={isDeterminate ? 0 : undefined}
          aria-valuemax={isDeterminate ? 100 : undefined}
          aria-valuenow={isDeterminate ? normalizedProgress : undefined}
          aria-valuetext={isDeterminate ? `${normalizedProgress}% complete` : statusLabel}
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        >
          {isIndeterminate ? (
            <motion.div
              aria-hidden="true"
              animate={reducedMotion ? { x: '100%' } : { x: ['-120%', '360%'] }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 1.15, ease: 'linear', repeat: Infinity, repeatType: 'loop' }
              }
              className="bg-info h-full w-1/3 rounded-full"
            />
          ) : (
            <motion.div
              aria-hidden="true"
              initial={false}
              animate={{ scaleX: (normalizedProgress || 0) / 100 }}
              transition={reducedMotion ? { duration: 0 } : NAV_MICRO_TRANSITION}
              className="h-full w-full origin-left rounded-full bg-white"
            />
          )}
        </div>
      ) : null}
    </div>
  );
});

export function createProgressHudEntry({
  id = 'task-progress-hud',
  isActive = true,
  title = 'Processing...',
  description = null,
  progress = null,
  isIndeterminate = false,
  icon = 'solar:refresh-circle-bold',
  actions = [],
  onCancel = null,
  autoDismissMs = null,
} = {}) {
  return {
    id,
    isActive: Boolean(isActive),
    priority: NAV_HUD_PRIORITY.TASK_PROGRESS,
    component: ProgressHud,
    props: {
      title,
      description,
      progress,
      isIndeterminate,
      icon,
      actions,
      canCancel: typeof onCancel === 'function',
    },
    progress,
    isIndeterminate,
    autoDismissMs,
    onCancel: typeof onCancel === 'function' ? onCancel : null,
  };
}

export function useProgressHud({
  id = 'task-progress-hud',
  isActive = false,
  title = 'Processing...',
  description = null,
  progress = null,
  isIndeterminate = false,
  icon = 'solar:refresh-circle-bold',
  actions = [],
  onCancel = null,
  autoDismissMs = null,
} = {}) {
  const descriptor = isActive
    ? createProgressHudEntry({
        id,
        isActive,
        title,
        description,
        progress,
        isIndeterminate,
        icon,
        actions,
        onCancel,
        autoDismissMs,
      })
    : null;

  useNavHud(descriptor);
}

export default ProgressHud;
