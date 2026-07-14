'use client';

import { AnimatePresence, motion } from 'framer-motion';
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

  const isVisible = isLoading && showOverlay && !isFullscreenStateActive;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="center fixed inset-0 h-screen w-screen"
        >
          <LoadingContent skeleton={skeleton} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
