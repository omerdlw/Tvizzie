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

  return (
    <AnimatePresence>
      {isLoading && showOverlay && !isFullscreenStateActive && (
        <motion.div
          className="center fixed inset-0 h-screen w-screen"
          initial={{}}
          animate={{}}
          exit={{}}
          transition={{
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <LoadingContent skeleton={skeleton} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
