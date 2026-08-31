'use client';

import { useSyncExternalStore } from 'react';

// ── Development diagnostics ──────────────────────────────────────────────────

const MAX_DIAGNOSTICS = 200;
const diagnostics = [];
const listeners = new Set();
let diagnosticsSnapshot = Object.freeze([]);

function publishDiagnosticsSnapshot() {
  diagnosticsSnapshot = Object.freeze(diagnostics.slice());
}

function isDiagnosticsEnabled() {
  return typeof process === 'undefined' || process.env?.NODE_ENV !== 'production';
}

export function recordRegistryDiagnostic(event) {
  if (!isDiagnosticsEnabled() || !event || typeof event !== 'object') return;

  diagnostics.push(
    Object.freeze({
      ...event,
      timestamp: Date.now(),
    }),
  );

  if (diagnostics.length > MAX_DIAGNOSTICS) {
    diagnostics.splice(0, diagnostics.length - MAX_DIAGNOSTICS);
  }
  publishDiagnosticsSnapshot();

  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Diagnostics must never affect registry state or application rendering.
    }
  });
}

export function getRegistryDiagnostics() {
  return diagnosticsSnapshot;
}

export function clearRegistryDiagnostics() {
  diagnostics.length = 0;
  publishDiagnosticsSnapshot();
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Diagnostics must never affect registry state or application rendering.
    }
  });
}

export function subscribeRegistryDiagnostics(listener) {
  if (typeof listener !== 'function') return () => {};

  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRegistryDiagnostics() {
  return useSyncExternalStore(
    subscribeRegistryDiagnostics,
    getRegistryDiagnostics,
    getRegistryDiagnostics,
  );
}
