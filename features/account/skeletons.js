import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/core/constants';
import { cn } from '@/core/utils';
import NavHeightSpacer from '@/ui/elements/nav-height-spacer';
import { AccountGridDivider, AccountGridFrame } from '@/features/account/shared/grid-animation';
import { SkeletonPoster } from '@/ui/skeletons/primitives';
import { AccountHeroSkeleton, AccountNavSkeleton } from './skeletons/hero-shell';
import { renderAccountSkeletonVariant } from './skeletons/variants';

export { resolveAccountSkeletonVariant } from './skeletons/route-variants';

export function MovieSectionSkeleton({ className = '', variant = 'gallery' }) {
  return <SkeletonPoster className={className} radius={'card'} soft={false} />;
}

export function Skeleton({ variant = 'overview' }) {
  return (
    <div className="account-detail-grid-content relative isolate min-h-dvh w-full overflow-hidden bg-black">
      <AccountGridFrame
        routeKey={`account-skeleton-${variant}`}
        className={cn('flex flex-col gap-0 px-0', ACCOUNT_ROUTE_SHELL_CLASS)}
      >
        {variant === 'overview' ? (
          <div className="relative">
            <AccountHeroSkeleton />
            <div className="absolute inset-x-0 top-0 z-20">
              <AccountNavSkeleton />
            </div>
          </div>
        ) : (
          <div className="relative z-20">
            <AccountNavSkeleton />
          </div>
        )}
        <div className="account-detail-hero-divider">
          <AccountGridDivider />
        </div>
        <main className="account-detail-grid-main flex w-full min-w-0 flex-col">
          {renderAccountSkeletonVariant(variant)}
        </main>
        <NavHeightSpacer />
      </AccountGridFrame>
    </div>
  );
}

export default Skeleton;
