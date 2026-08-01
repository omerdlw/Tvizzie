'use client';

import { useRegistry } from '@/core/modules/registry';

export function createRouteRegistry({ displayName = 'RouteRegistry', resolveConfig }) {
  function RouteRegistry(props) {
    const config = typeof resolveConfig === 'function' ? resolveConfig(props) : null;
    useRegistry(config || {});
    return null;
  }

  RouteRegistry.displayName = displayName;
  return RouteRegistry;
}
