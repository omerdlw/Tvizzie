import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/core/constants';
import { cn } from '@/core/utils';
import { SkeletonBlock, SkeletonLine } from '@/ui/skeletons/primitives';
import { Line, Pill } from './shared';

const HERO_HEIGHT_CLASS = cn('account-hero-height');
const HERO_BANNER_WRAPPER_CLASS = cn('account-hero-banner-wrapper');
const HERO_AMBIENT_OVERLAY_CLASS = cn('account-skeleton-hero-ambient-overlay absolute inset-0');
const HERO_SOFTEN_OVERLAY_CLASS = cn('account-hero-soften-overlay absolute inset-0');
const HERO_LEFT_FADE_CLASS = cn('account-hero-side-fade account-hero-left-fade absolute inset-y-0 left-0');
const HERO_RIGHT_FADE_CLASS = cn('account-hero-side-fade account-hero-right-fade absolute inset-y-0 right-0');
const HERO_TOP_FADE_CLASS = cn('account-hero-top-fade absolute inset-x-0 top-0');
const HERO_TINT_CLASS = cn('account-skeleton-hero-tint-overlay absolute inset-0');

function HeroCountItem({ mobile = false }) {
  return (
    <div
      className={
        mobile
          ? 'inline-flex min-w-0 items-baseline gap-1.5 text-left'
          : 'inline-flex items-baseline gap-1.5 whitespace-nowrap'
      }
    >
      <Line className={mobile ? 'h-4 w-10' : 'h-4 w-10'} />
      <Line className={mobile ? 'h-3 w-16' : 'h-3 w-14'} soft={true} />
    </div>
  );
}

function HeroEdgeMetric() {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <SkeletonLine size="xl" className="w-12" />
      <Line className="h-2.5 w-16" soft={true} />
    </div>
  );
}

export function AccountHeroSkeleton() {
  return (
    <section className={`relative w-full overflow-hidden bg-black ${HERO_HEIGHT_CLASS}`}>
      <div className="absolute inset-0">
        <div className={`${HERO_BANNER_WRAPPER_CLASS} opacity-70`}>
          <SkeletonBlock className="h-full w-full" soft={true} />
        </div>
      </div>
      <div className={HERO_TINT_CLASS} />
      <div className={HERO_SOFTEN_OVERLAY_CLASS} />
      <div className={HERO_AMBIENT_OVERLAY_CLASS} />
      <div className={HERO_LEFT_FADE_CLASS} />
      <div className={HERO_RIGHT_FADE_CLASS} />
      <div className={HERO_TOP_FADE_CLASS} />
      <div
        className={`${ACCOUNT_ROUTE_SHELL_CLASS} relative flex ${HERO_HEIGHT_CLASS} items-end px-4 pt-18 pb-5 sm:px-8 sm:pt-24 sm:pb-7 lg:pb-8`}
      >
        <div className="flex w-full flex-col gap-2 sm:gap-3">
          <div className={cn('account-skeleton-hero-layout grid w-full gap-y-4 lg:items-end lg:gap-x-8 lg:gap-y-0')}>
            <div className="h-24 w-24 justify-self-start overflow-hidden sm:h-32 sm:w-32 lg:row-span-2 lg:self-end">
              <SkeletonBlock className="h-full w-full" radius="hero" />
            </div>
            <div className="lg:col-start-2 lg:row-span-2 lg:self-end">
              <div className="flex flex-col gap-4">
                <SkeletonBlock className={cn('account-skeleton-hero-title')} />
                <div className="grid grid-cols-3 gap-x-5 gap-y-4 pt-1 lg:hidden">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <HeroCountItem key={index} mobile={true} />
                  ))}
                </div>

                <div className="hidden items-center gap-x-7 gap-y-2 lg:flex">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <HeroCountItem key={index} />
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden lg:col-start-3 lg:row-start-2 lg:block lg:self-end lg:justify-self-end">
              <div className="grid grid-cols-2 gap-6 text-center">
                <HeroEdgeMetric />
                <HeroEdgeMetric />
              </div>
            </div>
          </div>

          <div className={cn('account-skeleton-hero-bio')}>
            <div className="mt-2 flex max-w-3xl flex-col gap-2">
              <Line className="h-3.5 w-full" soft={true} />
              <Line className={cn('account-skeleton-hero-bio-trail h-3.5')} soft={true} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AccountNavSkeleton() {
  return (
    <div>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="flex w-full items-stretch gap-2 overflow-x-auto px-3 py-2.5 sm:justify-center sm:px-8 sm:py-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <Pill key={index} className="h-8 w-28 shrink-0" soft={index !== 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
