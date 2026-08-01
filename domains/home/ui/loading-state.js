import { SkeletonLine, SkeletonPoster } from '@/ui/feedback/skeleton';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';

export default function HomeLoadingState() {
  return (
    <PageGradientShell className="overflow-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-3 pt-20 pb-20 sm:px-4 md:px-6">
        <div className="space-y-3">
          <SkeletonLine className="w-28" size="sm" />
          <SkeletonLine className="w-64" size="xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonPoster key={index} />
          ))}
        </div>
        <div className="space-y-3">
          <SkeletonLine className="w-44" size="lg" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonPoster key={index} />
            ))}
          </div>
        </div>
      </div>
    </PageGradientShell>
  );
}
