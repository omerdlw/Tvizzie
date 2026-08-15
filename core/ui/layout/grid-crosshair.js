'use client';

import { cn } from '@/shared/utils';

/**
 * Reticle Crosshair — 11px genişlik ve yükseklikte + işareti.
 * Sol ve sağ wrapper dikey çizgileriyle (w-px) tam ayna simetrisiyle hizalanır.
 */
function CrosshairLines({ side = 'left', className = '' }) {
  const isLeft = side === 'left';
  return (
    <>
      {/* Dikey Kol: 11px uzunluk, 1px genişlik — wrapper dikey çizgisinin (w-px) tam üstünde */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0 h-[11px] w-px -translate-y-[5px] bg-white/20',
          isLeft ? 'left-0' : 'right-0',
          className,
        )}
      />
      {/* Yatay Kol: 11px genişlik, 1px yükseklik — dikey çizginin 5px sağına ve 5px soluna simetrik */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0 h-px w-[11px] bg-white/20',
          isLeft ? 'left-0 -translate-x-[5px]' : 'right-0 translate-x-[5px]',
          className,
        )}
      />
    </>
  );
}

/**
 * GridCrosshair — Yatay divider `left-px right-px` içindeyken kullanılır.
 * Sol dikey çizgi (left: 0) ve sağ dikey çizgi (right: 0) ile tam sıfıra sıfır oturur.
 *
 * @param {'left' | 'right'} side — hangi kenara yerleştirileceği
 */
export function GridCrosshair({ side = 'left', className = '' }) {
  const isLeft = side === 'left';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-0 block size-0 select-none',
        isLeft ? '-left-px' : '-right-px',
        className,
      )}
    >
      <CrosshairLines side={side} />
    </span>
  );
}

/**
 * GridShellCrosshairs — Tam genişlikli (w-screen) divider'lar için.
 * max-w-6xl (72rem) page shell sınırlarına sol ve sağ kesişim + işaretlerini tam pikselde yerleştirir.
 */
export function GridShellCrosshairs({ className = '' }) {
  // max-w-6xl = 72rem (36rem merkeze göre).
  // Sol dikey çizgi: calc(50vw - 36rem)
  // Sağ dikey çizgi: right: calc(50vw - 36rem)
  const leftStyle = { left: 'max(0px, calc(50vw - 36rem))' };
  const rightStyle = { right: 'max(0px, calc(50vw - 36rem))' };

  return (
    <>
      {/* Sol kenar dikey çizgi kesişimi */}
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute top-0 block size-0 select-none', className)}
        style={leftStyle}
      >
        <CrosshairLines side="left" />
      </span>

      {/* Sağ kenar dikey çizgi kesişimi */}
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute top-0 block size-0 select-none', className)}
        style={rightStyle}
      >
        <CrosshairLines side="right" />
      </span>
    </>
  );
}
