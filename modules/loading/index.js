'use client';

import { useIsFullscreenStateActive } from '@/ui/feedback/fullscreen-state';
import { Spinner } from '@/ui/feedback/spinner';

import { useLoadingState } from './loading-context';

export { useLoadingActions, LoadingProvider, useLoadingState } from './loading-context';

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
