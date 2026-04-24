'use client';

import { useIsFullscreenStateActive } from '@/ui/states/fullscreen-state';
import { Spinner } from '@/ui/loadings/spinner';

import { useLoadingState } from './context';

export { useLoadingActions, LoadingProvider, useLoadingState } from './context';

function LoadingContent({ skeleton }) {
  if (skeleton) return skeleton;
  return <Spinner size={50} />;
}

export function LoadingOverlay() {
  const { isLoading, skeleton, showOverlay } = useLoadingState();
  const isFullscreenStateActive = useIsFullscreenStateActive();

  if (!isLoading || !showOverlay || isFullscreenStateActive) {
    return null;
  }

  return (
    <div className="center fixed inset-0 h-screen w-screen">
      <LoadingContent skeleton={skeleton} />
    </div>
  );
}
