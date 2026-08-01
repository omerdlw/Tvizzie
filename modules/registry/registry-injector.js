'use client';

import { useEffect, useRef } from 'react';

import { useRegistryContext } from './registry-context';

let injectorInstanceCounter = 0;

export const RegistryInjector = ({ items, type }) => {
  const { batch, register, unregister } = useRegistryContext();
  const instanceIdRef = useRef(null);

  if (!instanceIdRef.current) {
    injectorInstanceCounter += 1;
    instanceIdRef.current = `registry-injector-${injectorInstanceCounter}`;
  }

  useEffect(() => {
    if (!items || !type) return;
    const entries = Object.entries(items);
    if (entries.length === 0) return;

    if (typeof batch === 'function') {
      batch((queue) => {
        entries.forEach(([key, item]) => {
          queue.register(type, key, item, { instanceId: instanceIdRef.current });
        });
      });
    } else {
      entries.forEach(([key, item]) => {
        register(type, key, item, { instanceId: instanceIdRef.current });
      });
    }

    return () => {
      if (typeof batch === 'function') {
        batch((queue) => {
          entries.forEach(([key]) => {
            queue.unregister(type, key, { instanceId: instanceIdRef.current });
          });
        });
        return;
      }

      entries.forEach(([key]) => {
        unregister(type, key, { instanceId: instanceIdRef.current });
      });
    };
  }, [batch, items, type, register, unregister]);

  return null;
};
