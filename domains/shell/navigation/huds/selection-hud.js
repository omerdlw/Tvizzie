'use client';

import { memo } from 'react';
import { motion } from 'motion/react';

import { NAV_HUD_PRIORITY, useNavHud } from '@/modules/nav';
import {
  NAV_BUTTON_TRANSITION,
  NAV_FADE_TRANSITION,
  NAV_TAP_SCALE,
  navListItemVariants,
  textCrossfadeVariants,
} from '@/modules/nav';
import { cn } from '@/ui/class-names';
import { Button, Tooltip } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/shared';

export const SelectionHud = memo(function SelectionHud({
  actions = [],
  count = 0,
  onCancel,
  title = null,
}) {
  const resolvedTitle = title || (count === 1 ? 'item selected' : 'items selected');

  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className="flex w-full items-center justify-between gap-2.5 select-none"
    >
      <div className="flex items-center">
        <div className="flex h-8 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white ring-1 ring-white/10 ring-inset">
          <span className="font-bold text-white">{count}</span>
          <span className="text-white/70">{resolvedTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions.map((action, index) => {
          const actionKey = action.key || `hud-action-${index}`;
          const isDestructive = Boolean(action.isDestructive);

          return (
            <motion.div
              key={actionKey}
              variants={navListItemVariants}
              initial="hidden"
              animate="visible"
              custom={index}
            >
              <Tooltip text={action.tooltip || action.label}>
                <Button
                  type="button"
                  disabled={action.disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    action.onClick?.(event);
                  }}
                  className={cn(
                    'center h-8 cursor-pointer gap-1.5 rounded-xl px-3 text-xs font-semibold ring-1 ring-inset',
                    isDestructive
                      ? DESTRUCTIVE_ACTION_TONE_CLASS
                      : 'bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10',
                    action.disabled && 'cursor-not-allowed opacity-50',
                  )}
                  aria-label={action.label}
                >
                  {action.icon ? <Icon icon={action.icon} size={15} /> : null}
                  <span>{action.label}</span>
                </Button>
              </Tooltip>
            </motion.div>
          );
        })}

        {typeof onCancel === 'function' && (
          <motion.div
            variants={navListItemVariants}
            initial="hidden"
            animate="visible"
            custom={actions.length}
          >
            <Tooltip text="Cancel selection">
              <Button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCancel();
                }}
                className="center h-8 w-8 cursor-pointer rounded-xl bg-white/5 text-white/50 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
                aria-label="Cancel selection"
              >
                <Icon icon="solar:close-circle-bold" size={16} />
              </Button>
            </Tooltip>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export function createSelectionHudEntry({
  actions = [],
  count = 0,
  id = 'selection-hud',
  isActive = true,
  onCancel = null,
  title = null,
} = {}) {
  return {
    id,
    isActive: Boolean(isActive),
    priority: NAV_HUD_PRIORITY.SELECTION,
    component: SelectionHud,
    props: {
      actions: Array.isArray(actions) ? actions : [],
      count: Number(count) || 0,
      title,
    },
    onCancel: typeof onCancel === 'function' ? onCancel : null,
  };
}

export function useSelectionHud({
  actions = [],
  count = 0,
  id = 'selection-hud',
  isActive = false,
  onCancel = null,
  title = null,
} = {}) {
  const descriptor = isActive
    ? createSelectionHudEntry({
        actions,
        count,
        id,
        isActive,
        onCancel,
        title,
      })
    : null;

  useNavHud(descriptor);
}

export default SelectionHud;
