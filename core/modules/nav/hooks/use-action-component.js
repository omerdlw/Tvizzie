'use client';

import React, { useMemo } from 'react';

function normalizePath(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized === '/') {
    return '/';
  }

  return normalized.replace(/\/+$/, '');
}

function isActionPathMatch(path, pathname) {
  const normalizedPath = normalizePath(path);
  const normalizedPathname = normalizePath(pathname);

  if (!normalizedPath || !normalizedPathname) {
    return false;
  }

  if (normalizedPath === normalizedPathname) {
    return true;
  }

  if (normalizedPath === '/') {
    return normalizedPathname === '/';
  }

  return normalizedPathname.startsWith(`${normalizedPath}/`);
}

function shouldRenderAction({ action, isLoading, isOverlay, path }, pathname) {
  if (!action) return false;
  if (isLoading) return false;

  if (!isOverlay && path && !isActionPathMatch(path, pathname)) {
    return false;
  }

  return true;
}

function resolveActionNode(action) {
  if (React.isValidElement(action)) {
    return action;
  }

  if (typeof action === 'function') {
    const ActionComponent = action;
    return <ActionComponent />;
  }

  return null;
}

export function useActionComponent(link, pathname) {
  const { action, isLoading, isOverlay, path } = link;

  return useMemo(() => {
    if (!shouldRenderAction({ action, isLoading, isOverlay, path }, pathname)) {
      return null;
    }

    return resolveActionNode(action);
  }, [action, isLoading, isOverlay, path, pathname]);
}
