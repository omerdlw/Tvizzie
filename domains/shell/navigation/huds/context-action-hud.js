'use client';

import { memo } from 'react';

import { NAV_HUD_PRIORITY, NAV_HUD_VARIANT, useNavHud } from '@/modules/nav';
import { NavHudShell } from '@/modules/nav';

export const ContextActionHud = memo(function ContextActionHud({
  title = 'Context Actions',
  description = null,
  icon = 'solar:tuning-2-bold',
  actions = [],
  variant = NAV_HUD_VARIANT.EXPANDED,
  onCancel = null,
}) {
  return (
    <NavHudShell
      icon={icon}
      title={title}
      description={description}
      actions={actions}
      variant={variant}
      onCancel={onCancel}
    />
  );
});

export function createContextActionHudEntry({
  id = 'context-action-hud',
  isActive = true,
  title = 'Context Actions',
  description = null,
  icon = 'solar:tuning-2-bold',
  actions = [],
  variant = NAV_HUD_VARIANT.EXPANDED,
  onCancel = null,
  autoDismissMs = null,
} = {}) {
  return {
    id,
    isActive: Boolean(isActive),
    priority: NAV_HUD_PRIORITY.CONTEXTUAL,
    component: ContextActionHud,
    props: {
      title,
      description,
      icon,
      actions,
      variant,
      onCancel,
    },
    autoDismissMs,
    onCancel: typeof onCancel === 'function' ? onCancel : null,
  };
}

export function useContextActionHud({
  id = 'context-action-hud',
  isActive = false,
  title = 'Context Actions',
  description = null,
  icon = 'solar:tuning-2-bold',
  actions = [],
  variant = NAV_HUD_VARIANT.EXPANDED,
  onCancel = null,
  autoDismissMs = null,
} = {}) {
  const descriptor = isActive
    ? createContextActionHudEntry({
        id,
        isActive,
        title,
        description,
        icon,
        actions,
        variant,
        onCancel,
        autoDismissMs,
      })
    : null;

  useNavHud(descriptor);
}

export default ContextActionHud;
