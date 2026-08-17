'use client';

import { useIsFullscreenStateActive } from '@/domains/shell/shared/components/feedback/fullscreen-state';
import { Spinner } from '@/domains/shell/shared/components/feedback/spinner';

import { useLoadingState } from './context';

export { useLoadingActions, LoadingProvider, useLoadingState } from './context';

function LoadingContent({ skeleton }) {
  if (skeleton) return skeleton;
  return <Spinner size={50} />;
}

export function LoadingOverlay() {
  const { isLoading, skeleton, showOverlay } = useLoadingState();
  const isFullscreenStateActive = useIsFullscreenStateActive();

  const isVisible = isLoading && showOverlay && !isFullscreenStateActive;

  if (!isVisible) return null;

  return (
    <div key="loading-overlay" className="center fixed inset-0 h-screen w-screen">
      <LoadingContent skeleton={skeleton} />
    </div>
  );
}
