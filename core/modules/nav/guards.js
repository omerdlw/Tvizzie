'use client';

import { useCallback, useEffect, useRef } from 'react';

const guardRegistry = new Map();
let guardIdCounter = 0;

export function registerGuard(guard) {
  const id = ++guardIdCounter;
  guardRegistry.set(id, guard);
  return () => guardRegistry.delete(id);
}

export async function checkGuards(to, from) {
  for (const [id, guard] of guardRegistry) {
    let shouldBlock = typeof guard.when === 'function' ? guard.when(to, from) : guard.when;

    try {
      shouldBlock = await Promise.resolve(shouldBlock);
    } catch (error) {
      console.error('[Navigation Guard] Guard evaluation failed:', error);
      shouldBlock = false;
    }

    if (shouldBlock) {
      const message = guard.message || 'Are you sure you want to leave this page';
      guard.onBlock?.({ to, from, guardId: id, message });
      return {
        message,
        blocked: true,
        guardId: id,
      };
    }
  }
  return { blocked: false };
}

export function useNavigationGuard(options = {}) {
  const { message = 'You have unsaved changes Are you sure you want to leave', when = false, onBlock } = options;

  const guardRef = useRef(null);
  const whenRef = useRef(when);

  useEffect(() => {
    whenRef.current = when;
  }, [when]);

  useEffect(() => {
    const unregister = registerGuard({
      when: () => whenRef.current,
      message,
      onBlock,
    });

    guardRef.current = unregister;

    return () => {
      if (guardRef.current) {
        guardRef.current();
      }
    };
  }, [message, onBlock]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (whenRef.current) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [message]);

  const setGuard = useCallback((active) => {
    whenRef.current = active;
  }, []);

  const clearGuard = useCallback(() => {
    whenRef.current = false;
  }, []);

  return {
    isActive: when,
    clearGuard,
    setGuard,
  };
}
