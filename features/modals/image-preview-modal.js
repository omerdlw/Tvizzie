'use client';

import { useState } from 'react';
import Image from 'next/image';

import { TMDB_IMG } from '@/core/constants';
import Container from '@/core/modules/modal/container';
import { Spinner } from '@/ui/loadings/spinner';

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getAspectRatio(data) {
  const aspectRatio = Number(data?.aspect_ratio);
  if (Number.isFinite(aspectRatio) && aspectRatio > 0) return aspectRatio;

  const width = Number(data?.width);
  const height = Number(data?.height);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return width / height;
  }

  return 16 / 9;
}

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

export default function ImagePreviewModal({ close, data }) {
  const [isLoaded, setIsLoaded] = useState(false);

  const filePath = data?.file_path;
  if (!filePath) return null;

  const aspectRatio = Math.min(Math.max(getAspectRatio(data), 0.35), 3);
  const isPortrait = aspectRatio < 1;
  const frameWidthClass = isPortrait ? 'w-[min(92vw,560px)]' : 'w-[min(92vw,1200px)]';

  return (
    <ModalView
      close={close}
      data={data}
      filePath={filePath}
      aspectRatio={aspectRatio}
      frameWidthClass={frameWidthClass}
      isLoaded={isLoaded}
      setIsLoaded={setIsLoaded}
    />
  );
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

function ModalView({ close, data, filePath, aspectRatio, frameWidthClass, isLoaded, setIsLoaded }) {
  return (
    <Container
      className={`relative max-h-[85vh] ${frameWidthClass}`}
      close={close}
      header={false}
      bodyClassName="p-0"
      footer={false}
    >
      <div className="relative h-auto w-full" style={{ aspectRatio: String(aspectRatio) }}>
        <Image
          src={`${TMDB_IMG}/original${filePath}`}
          className={`object-contain transition duration-[200ms] ${isLoaded ? 'visible' : 'invisible'}`}
          onLoad={() => setIsLoaded(true)}
          sizes="92vw"
          quality={90}
          alt={data?.name || 'Preview image'}
          fill
        />
        {!isLoaded && (
          <div className="center absolute inset-0 animate-pulse bg-black/5">
            <Spinner size={40} />
          </div>
        )}
      </div>
    </Container>
  );
}
