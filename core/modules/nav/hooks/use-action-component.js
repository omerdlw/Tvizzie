'use client';

import React, { useMemo } from 'react';

function shouldRenderAction({ action, isLoading, isOverlay, path }, pathname) {
  if (!action) return false;
  if (isLoading) return false;

  if (!isOverlay && path && pathname !== path) {
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
