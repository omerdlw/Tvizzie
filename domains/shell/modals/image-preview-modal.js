'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MOTION_EASINGS } from '@/shared';

import { TMDB_IMG } from '@/shared';
import { Container } from '@/modules/modal';
import AdaptiveImage from '@/ui/components/adaptive-image';
import { Spinner } from '@/ui/feedback/spinner';

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
      className={`relative max-h-[85vh] ${frameWidthClass}`}
      close={close}
      header={false}
      bodyClassName="p-0"
      footer={false}
    >
      <div
        className="relative h-auto w-full overflow-hidden rounded-[20px]"
        style={{ aspectRatio: String(aspectRatio) }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.42, ease: MOTION_EASINGS.SOFT }}
          className="absolute inset-0 h-full w-full"
        >
          <AdaptiveImage
            src={`${TMDB_IMG}/original${filePath}`}
            className="object-contain"
            onLoad={() => setIsLoaded(true)}
            sizes="92vw"
            quality={90}
            alt={data?.name || 'Preview image'}
            fill
            mode="next"
            wrapperClassName="size-full"
          />
        </motion.div>
        <AnimatePresence>
          {!isLoaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: MOTION_EASINGS.EMPHASIZED }}
              className="center absolute inset-0 rounded-[20px] bg-white/5"
            >
              <Spinner size={40} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Container>
  );
}
