'use client';

import { motion } from 'framer-motion';
import { Container } from '@/modules/modal';

export default function VideoPreviewModal({ close, data }) {
  if (!data?.key) return null;

  return (
    <Container
      className="relative max-h-[85vh] w-[min(92vw,1200px)] rounded-3xl"
      close={close}
      header={false}
      bodyClassName="p-0"
      footer={{ center: data?.name || 'Video preview' }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1], delay: 0.08 }}
        className="relative aspect-video h-auto w-full overflow-hidden"
      >
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          src={`https://www.youtube.com/embed/${data.key}?autoplay=1`}
          className="absolute inset-0 h-full w-full"
          title={data.name || 'Video preview'}
          allowFullScreen
        />
      </motion.div>
    </Container>
  );
}
