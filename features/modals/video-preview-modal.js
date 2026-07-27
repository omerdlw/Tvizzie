'use client';

import { motion } from 'framer-motion';
import { Container } from '@/core/modules/modal';

export default function VideoPreviewModal({ close, data }) {
  if (!data?.key) return null;

  return <ModalView close={close} data={data} />;
}

function ModalView({ close, data }) {
  return (
    <Container
      className="relative max-h-[85vh] w-[min(92vw,1200px)] rounded-[24px]"
      close={close}
      header={false}
      bodyClassName="p-0"
      footer={{ center: data?.name || 'Video preview' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, filter: 'blur(12px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.24, 1] }}
        className="relative aspect-video h-auto w-full overflow-hidden"
      >
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
