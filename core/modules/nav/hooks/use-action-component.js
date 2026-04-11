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

function matchesPathOrDescendant(pathname, path) {
  const normalizedPathname = normalizePath(pathname);
  const normalizedPath = normalizePath(path);

  if (!normalizedPathname || !normalizedPath) {
    return false;
  }

  if (normalizedPathname === normalizedPath) {
    return true;
  }

  // Root path should only match itself, not every route.
  if (normalizedPath === '/') {
    return false;
  }

  return normalizedPathname.startsWith(`${normalizedPath}/`);
}

function shouldRenderAction({ action, isLoading, isOverlay, path, activeChild }, pathname) {
  if (!action) return false;
  if (isLoading) return false;

  const matchesActiveChild =
    activeChild?.path && typeof activeChild.path === 'string' ? pathname === activeChild.path : false;
  const matchesPath = matchesPathOrDescendant(pathname, path);

  if (!isOverlay && path && !matchesPath && !matchesActiveChild) {
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
  const { action, isLoading, isOverlay, path, activeChild } = link;

  return useMemo(() => {
    if (!shouldRenderAction({ action, isLoading, isOverlay, path, activeChild }, pathname)) {
      return null;
    }

    return resolveActionNode(action);
  }, [action, activeChild, isLoading, isOverlay, path, pathname]);
}
