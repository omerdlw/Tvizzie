'use client';

import React, { useMemo } from 'react';

import { isPathPrefix, isSamePath } from './hooks/navigation-path-model';

export function isInlineActionPathMatch(path, pathname) {
  if (isSamePath(path, pathname)) {
    return true;
  }

  return path !== '/' && isPathPrefix(path, pathname);
}

export function shouldRenderInlineAction({ action, isLoading, isOverlay, path }, pathname) {
  if (!action) return false;
  if (isLoading) return false;

  if (!isOverlay && path && !isInlineActionPathMatch(path, pathname)) {
    return false;
  }

  return true;
}

export function resolveInlineActionNode(action) {
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
    if (!shouldRenderInlineAction({ action, isLoading, isOverlay, path }, pathname)) {
      return null;
    }

    return resolveInlineActionNode(action);
  }, [action, isLoading, isOverlay, path, pathname]);
}
