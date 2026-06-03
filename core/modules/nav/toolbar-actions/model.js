export const NAV_ACTION_KEYS = Object.freeze({
  NOTIFICATIONS: 'notifications',
  LOGOUT: 'logout',
  SCROLL_TOP: 'scroll-top',
  TOGGLE_MUTE: 'toggle-mute',
  SETTINGS: 'settings',
});

export const NAV_ACTION_ORDER = Object.freeze({
  NOTIFICATIONS: -10,
  SETTINGS: 0,
  TOGGLE_MUTE: 10,
  SCROLL_TOP: 20,
  LOGOUT: 30,
});

export function normalizeToolbarActions(actions) {
  if (!actions) return [];

  const actionList = Array.isArray(actions) ? actions : [actions];

  return actionList.map((action, index) => ({
    key: action.key || `action-${index}`,
    ...action,
  }));
}

export function getVisibleToolbarActions(actions) {
  return actions.filter((action) => action.visible !== false);
}

export function sortToolbarActionsByOrder(actions) {
  return [...actions].sort((a, b) => (b.order || 0) - (a.order || 0));
}

export function isActionlessNavItem(activeItem) {
  return activeItem?.isNotFound || activeItem?.path === 'not-found' || activeItem?.isMasked || activeItem?.isSurface;
}

export function isStatusToolbarActionAllowed(activeItem) {
  return activeItem?.type === 'APP_ERROR' || activeItem?.type === 'API_ERROR';
}

export function filterContextToolbarActions(actions, activeItem) {
  return actions.filter((action) => {
    if (action.key === NAV_ACTION_KEYS.LOGOUT && activeItem?.hideLogout) {
      return false;
    }

    if (action.key === NAV_ACTION_KEYS.SETTINGS && activeItem?.hideSettings) {
      return false;
    }

    if (action.key === NAV_ACTION_KEYS.SCROLL_TOP && activeItem?.hideScroll) {
      return false;
    }

    return true;
  });
}
