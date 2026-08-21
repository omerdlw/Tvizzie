'use client';

import { useEffect, useId, useRef } from 'react';

import { useRegistryActions } from './context';

export function RegistryBootstrap({ entries = [] }) {
  const { batch } = useRegistryActions();
  const defaultId = useId();
  const instanceIdRef = useRef(`registry-bootstrap-${defaultId}`);

  useEffect(() => {
    const normalizedEntries = entries.filter(
      (entry) => entry?.type && entry?.items && typeof entry.items === 'object',
    );

    if (normalizedEntries.length === 0) return undefined;

    const registerEntry = (queue, entry) => {
      const source = entry.source || 'static';
      const options = {
        ...(entry.options || {}),
        instanceId: instanceIdRef.current,
      };

      Object.entries(entry.items).forEach(([key, value]) => {
        queue.register(entry.type, key, value, source, options);
      });
    };

    const unregisterEntry = (queue, entry) => {
      const source = entry.source || 'static';
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
