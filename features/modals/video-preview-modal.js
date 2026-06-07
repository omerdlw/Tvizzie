'use client';

import Container from '@/core/modules/modal/container';
import { motion } from 'framer-motion';
const videoFadeIn = Object.freeze({
  initial: Object.freeze({ opacity: 0, filter: 'blur(4px)' }),
  animate: Object.freeze({ opacity: 1, filter: 'blur(0px)' }),
  exit: Object.freeze({ opacity: 0, filter: 'blur(3px)' }),
  transition: Object.freeze({ duration: 0.24, ease: 'easeOut' }),
});

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

export default function VideoPreviewModal({ close, data }) {
  if (!data?.key) return null;

  return <ModalView close={close} data={data} />;
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

function ModalView({ close, data }) {
  return (
    <Container
      className="relative max-h-[85vh] w-[min(92vw,1200px)]"
      close={close}
      header={false}
      bodyClassName="p-0"
      footer={{ center: data?.name || 'Video preview' }}
    >
      <motion.div {...videoFadeIn} className="relative aspect-video h-auto w-full">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          src={`https://www.youtube.com/embed/${data.key}?autoplay=1`}
          className="absolute inset-0 h-full w-full"
          title={data.name}
          allowFullScreen
        />
      </motion.div>
    </Container>
  );
}
