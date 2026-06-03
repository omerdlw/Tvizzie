import React from 'react';

export const NAV_SURFACE_RENDER_MODE = Object.freeze({
  COMPONENT: 'component',
  NODE: 'node',
});

export function isSurfaceDescriptor(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value) && !React.isValidElement(value);
}

export function createSurfaceEntryDefinition(input, config = {}) {
  const descriptor =
    isSurfaceDescriptor(input) &&
    (typeof input.component === 'function' ||
      Object.prototype.hasOwnProperty.call(input, 'content') ||
      Object.prototype.hasOwnProperty.call(input, 'node') ||
      Object.prototype.hasOwnProperty.call(input, 'element'))
      ? input
      : null;

  const component =
    typeof descriptor?.component === 'function' ? descriptor.component : typeof input === 'function' ? input : null;

  const content = descriptor?.content ?? descriptor?.node ?? descriptor?.element ?? null;

  if (!component && content == null && !React.isValidElement(input)) {
    return null;
  }

  return {
    renderMode: component ? NAV_SURFACE_RENDER_MODE.COMPONENT : NAV_SURFACE_RENDER_MODE.NODE,
    component,
    content: component ? null : (content ?? input),
    props: component ? (descriptor?.props && typeof descriptor.props === 'object' ? descriptor.props : config) : {},
    action: descriptor?.action ?? config?.action ?? null,
    showAction: descriptor?.showAction ?? config?.showAction ?? false,
    dismissible: descriptor?.dismissible ?? config?.dismissible ?? true,
    onClose: descriptor?.onClose ?? config?.onClose ?? null,
    icon: descriptor?.icon ?? config?.icon ?? null,
    title: descriptor?.title ?? config?.title ?? null,
    description: descriptor?.description ?? config?.description ?? null,
    trailing: descriptor?.trailing ?? config?.trailing ?? null,
    closeLabel: descriptor?.closeLabel ?? config?.closeLabel ?? null,
  };
}

export function createInlineSurfaceEntry(surface) {
  if (surface === undefined) {
    return null;
  }

  if (!isSurfaceDescriptor(surface)) {
    return {
      renderMode: NAV_SURFACE_RENDER_MODE.NODE,
      component: null,
      content: surface,
      props: {},
      action: null,
      showAction: undefined,
      dismissible: true,
      onClose: null,
      icon: null,
      title: null,
      description: null,
      trailing: null,
      closeLabel: null,
    };
  }

  const component = typeof surface.component === 'function' ? surface.component : null;
  const content = surface.content ?? surface.node ?? surface.element ?? null;

  if (!component && content == null) {
    return null;
  }

  return {
    renderMode: component ? NAV_SURFACE_RENDER_MODE.COMPONENT : NAV_SURFACE_RENDER_MODE.NODE,
    component,
    content: component ? null : content,
    props: surface.props && typeof surface.props === 'object' ? surface.props : {},
    action: surface.action ?? null,
    showAction: surface.showAction,
    dismissible: surface.dismissible ?? true,
    onClose: typeof surface.onClose === 'function' ? surface.onClose : null,
    icon: surface.icon ?? null,
    title: surface.title ?? null,
    description: surface.description ?? null,
    trailing: surface.trailing ?? null,
    closeLabel: surface.closeLabel ?? null,
  };
}

export function resolveSurfaceAction(item, surfaceEntry) {
  if (surfaceEntry?.action != null) {
    return surfaceEntry.action;
  }

  if (surfaceEntry?.showAction === true) {
    return item.action ?? null;
  }

  if (surfaceEntry?.showAction === false) {
    return null;
  }

  return item.action ?? null;
}
