'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '@/modules/modal';
import { MOTION_EASINGS } from '@/shared';

export default function VideoPreviewModal({ close, data }) {
  const [isPlaying, setIsPlaying] = useState(Boolean(data?.key));

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsPlaying(false);
        close?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [close]);

  const handleClose = () => {
    setIsPlaying(false);
    close?.();
  };

  if (!data?.key) return null;

  return (
    <Container
      className="relative max-h-[85vh] w-[min(92vw,1200px)] overflow-hidden rounded-[30px]"
      close={handleClose}
      header={false}
      bodyClassName="p-0 overflow-hidden"
      footer={{ center: data?.name || 'Video preview' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.28, ease: MOTION_EASINGS.SOFT }}
        className="relative aspect-video h-auto w-full overflow-hidden rounded-[20px] bg-black"
      >
        <AnimatePresence>
          {isPlaying ? (
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              src={`https://www.youtube.com/embed/${data.key}?autoplay=1&enablejsapi=1&rel=0`}
              className="absolute inset-0 h-full w-full border-0"
              title={data.name || 'Video preview'}
              allowFullScreen
            />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </Container>
  );
}
