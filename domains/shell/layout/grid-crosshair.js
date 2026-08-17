'use client';

import { cn } from '@/domains/shell/shared/utils';

function CrosshairLines({ side = 'left', className = '' }) {
  const isLeft = side === 'left';
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0 h-[11px] w-px -translate-y-[5px] bg-white/20',
          isLeft ? 'left-0' : 'right-0',
          className,
        )}
      />
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

export function GridShellCrosshairs({ className = '' }) {
  const leftStyle = { left: 'max(0px, calc(50vw - 36rem))' };
  const rightStyle = { right: 'max(0px, calc(50vw - 36rem))' };

  return (
    <>
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute top-0 block size-0 select-none', className)}
        style={leftStyle}
      >
        <CrosshairLines side="left" />
      </span>
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
