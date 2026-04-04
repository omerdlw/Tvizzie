'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const GRAIN_TILE_SIZE = Object.freeze({
  fine: 48,
  medium: 64,
  coarse: 96,
});

function createStaticNoiseTexture(tileSize) {
  if (typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  const imageData = ctx.createImageData(tileSize, tileSize);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const value = Math.floor(Math.random() * 256);
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
}

export function NoiseTexture({ className, opacity = 0.4, grain = 'medium', blend = 'normal', style }) {
  const [textureUrl, setTextureUrl] = useState('');

  useEffect(() => {
    const tileSize = GRAIN_TILE_SIZE[grain] ?? GRAIN_TILE_SIZE.medium;

    try {
      setTextureUrl(createStaticNoiseTexture(tileSize));
    } catch (error) {
      console.warn('Failed to create static noise texture', error);
      setTextureUrl('');
    }
  }, [grain]);

  const backgroundSize = `${GRAIN_TILE_SIZE[grain] ?? GRAIN_TILE_SIZE.medium}px ${
    GRAIN_TILE_SIZE[grain] ?? GRAIN_TILE_SIZE.medium
  }px`;

  return (
    <div
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{
        opacity,
        mixBlendMode: blend,
        backgroundImage: textureUrl ? `url("${textureUrl}")` : undefined,
        backgroundRepeat: 'repeat',
        backgroundSize,
        imageRendering: 'pixelated',
        width: '100%',
        height: '100%',
        ...style,
      }}
    />
  );
}
