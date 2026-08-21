'use client';

import { useRegistry } from './use-registry';

export function createRouteRegistry({ displayName = 'RouteRegistry', resolveConfig }) {
  function RouteRegistry(props) {
    const config = typeof resolveConfig === 'function' ? resolveConfig(props) : null;
    useRegistry(config || {});
    return null;
  }

  RouteRegistry.displayName = displayName;
  return RouteRegistry;
}
