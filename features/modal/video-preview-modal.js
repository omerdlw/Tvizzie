'use client';

import Container from '@/core/modules/modal/container';

export default function VideoPreviewModal({ close, data }) {
  if (!data?.key) return null;

  return (
    <Container
      className="relative max-h-[85vh] w-[min(92vw,1200px)]"
      close={close}
      header={false}
      bodyClassName="p-0"
      footer={{
        center: data?.name || 'Video preview',
      }}
    >
      <div className="relative aspect-video h-auto w-full">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          src={`https://www.youtube.com/embed/${data.key}?autoplay=1`}
          className="absolute inset-0 h-full w-full"
          title={data.name}
          allowFullScreen
        />
      </div>
    </Container>
  );
}
