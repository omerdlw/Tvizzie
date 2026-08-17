'use client';

import { useEffect, useId, useRef } from 'react';

import { useRegistryActions } from './context';

export function RegistryBootstrap({ entries = [] }) {
  const { batch, register, unregister } = useRegistryActions();
  const defaultId = useId();
  const instanceIdRef = useRef(`registry-bootstrap-${defaultId}`);

  useEffect(() => {
    const normalizedEntries = entries.filter(
      (entry) => entry?.type && entry?.items && typeof entry.items === 'object',
    );

    if (normalizedEntries.length === 0) return undefined;

    const registerEntry = (target, entry) => {
      const source = entry.source || 'static';
      const options = {
        ...(entry.options || {}),
        instanceId: instanceIdRef.current,
      };

      Object.entries(entry.items).forEach(([key, value]) => {
        target.register(entry.type, key, value, source, options);
      });
    };

    const unregisterEntry = (target, entry) => {
      const source = entry.source || 'static';
      const options = {
        ...(entry.options || {}),
        instanceId: instanceIdRef.current,
      };

      Object.keys(entry.items).forEach((key) => {
        target.unregister(entry.type, key, { ...options, source });
      });
    };

    if (typeof batch === 'function') {
      batch((queue) => {
        normalizedEntries.forEach((entry) => registerEntry(queue, entry));
      });
    } else {
      normalizedEntries.forEach((entry) => registerEntry({ register }, entry));
    }

    return () => {
      if (typeof batch === 'function') {
        batch((queue) => {
          normalizedEntries.forEach((entry) => unregisterEntry(queue, entry));
        });
        return;
      }

      normalizedEntries.forEach((entry) => unregisterEntry({ unregister }, entry));
    };
  }, [batch, entries, register, unregister]);

  return null;
}
