'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

import { TMDB_IMG } from '@/shared/constants';
import { Container } from '@/modules/modal';
import { Spinner } from '@/ui/feedback/spinner';

// --- HELPERS ---

function calculateAspectRatio(data) {
  const ratio = Number(data?.aspect_ratio);
  if (Number.isFinite(ratio) && ratio > 0) return ratio;

  const w = Number(data?.width);
  const h = Number(data?.height);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return w / h;
  }
  return 16 / 9;
}

// --- MAIN COMPONENT ---

export default function ImagePreviewModal({ close, data }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const filePath = data?.file_path;

  const aspectRatio = useMemo(() => {
    return Math.min(Math.max(calculateAspectRatio(data), 0.35), 3);
  }, [data]);

  if (!filePath) return null;

  const isPortrait = aspectRatio < 1;
  const frameWidthClass = isPortrait ? 'w-[min(92vw,560px)]' : 'w-[min(92vw,1200px)]';

  return (
    <Container
      className={`relative max-h-[85vh] rounded-[24px] ${frameWidthClass}`}
      close={close}
      header={false}
      bodyClassName="p-0"
      footer={false}
    >
      <div
        className="relative h-auto w-full overflow-hidden"
        style={{ aspectRatio: String(aspectRatio) }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.24, 1] }}
          className="absolute inset-0 h-full w-full"
        >
          <Image
            src={`${TMDB_IMG}/original${filePath}`}
            className="object-contain"
            onLoad={() => setIsLoaded(true)}
            sizes="92vw"
            quality={90}
            alt={data?.name || 'Preview image'}
            fill
          />
        </motion.div>
        {!isLoaded && (
          <div className="center absolute inset-0 bg-black/5">
            <Spinner size={40} />
          </div>
        )}
      </div>
    </Container>
  );
}
