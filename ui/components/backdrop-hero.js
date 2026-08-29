'use client';

import { cn } from '@/ui/class-names';

export const BACKDROP_HERO_GRADIENT_CLASS =
  'backdrop-hero-gradient absolute inset-0 z-10';

export function BackdropHero({
  className,
  image,
  imageClassName,
  position = 'center 20%',
}) {
  if (!image) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative isolate h-64 w-full overflow-hidden sm:h-80 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(30rem,45vw,36rem)] lg:w-[calc(100%+16rem)] lg:-translate-x-32',
        className
      )}
    >
      <div
        className={cn('absolute inset-0 bg-cover bg-no-repeat', imageClassName)}
        style={{
          backgroundColor: 'var(--black)',
          backgroundImage: `url(${image})`,
          backgroundPosition: position,
        }}
      />
      <div className={BACKDROP_HERO_GRADIENT_CLASS} />
    </div>
  );
}

export default BackdropHero;
