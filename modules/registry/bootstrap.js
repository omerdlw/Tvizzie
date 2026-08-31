'use client';

import { useEffect, useId, useLayoutEffect, useRef } from 'react';

import { REGISTRY_SOURCES } from './contracts';
import { useRegistry } from './hooks';
import { useRegistryActions } from './provider';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// ── Bootstrap and route adapters ─────────────────────────────────────────────

export function RegistryBootstrap({ entries = [] }) {
  const { batch } = useRegistryActions();
  const defaultId = useId();
  const instanceIdRef = useRef(`registry-bootstrap-${defaultId}`);

  useIsomorphicLayoutEffect(() => {
    const normalizedEntries = (Array.isArray(entries) ? entries : []).filter(
      (entry) => entry?.type && entry?.items && typeof entry.items === 'object',
    );

    if (normalizedEntries.length === 0) return undefined;

    const registerEntry = (queue, entry) => {
      const source = entry.source || REGISTRY_SOURCES.STATIC;
      const options = {
        ...(entry.options || {}),
        instanceId: instanceIdRef.current,
      };

      Object.entries(entry.items).forEach(([key, value]) => {
        queue.register(entry.type, key, value, source, options);
      });
    };

    const unregisterEntry = (queue, entry) => {
      const source = entry.source || REGISTRY_SOURCES.STATIC;
      const options = {
        ...(entry.options || {}),
        instanceId: instanceIdRef.current,
      };

      Object.keys(entry.items).forEach((key) => {
        queue.unregister(entry.type, key, { ...options, source });
      });
    };

    batch((queue) => {
      normalizedEntries.forEach((entry) => registerEntry(queue, entry));
    });

    return () => {
      batch((queue) => {
        normalizedEntries.forEach((entry) => unregisterEntry(queue, entry));
      });
    };
  }, [batch, entries]);

  return null;
}

export function createRouteRegistry({ displayName = 'RouteRegistry', resolveConfig }) {
  function RouteRegistry(props) {
    const config = typeof resolveConfig === 'function' ? resolveConfig(props) : null;
    useRegistry(config || {});
    return null;
  }

  RouteRegistry.displayName = displayName;
  return RouteRegistry;
}
