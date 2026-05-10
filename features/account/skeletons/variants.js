import { cn } from '@/core/utils';
import { SkeletonBlock, SkeletonCircle, SkeletonPoster } from '@/ui/skeletons/primitives';
import {
  ActivityItemSkeleton,
  FilterBarSkeleton,
  FormFieldSkeleton,
  Line,
  ListCardSkeleton,
  ListDetailHeaderSkeleton,
  MediaFieldSkeleton,
  PaginationSkeleton,
  Pill,
  Poster,
  PosterGridSkeleton,
  PosterStripSkeleton,
  ReviewCardSkeleton,
  SectionBodySkeleton,
  SectionHeadingSkeleton,
  SectionShell,
  ToolbarSkeleton,
} from './shared';

function OverviewSkeleton() {
  return (
    <div className="flex flex-col">
      <SectionShell>
        <SectionHeadingSkeleton />
        <SectionBodySkeleton>
          <PosterStripSkeleton count={5} />
        </SectionBodySkeleton>
      </SectionShell>

      <SectionShell>
        <SectionHeadingSkeleton />
        <SectionBodySkeleton>
          <PosterStripSkeleton count={6} />
        </SectionBodySkeleton>
      </SectionShell>

      <SectionShell>
        <SectionHeadingSkeleton />
        <SectionBodySkeleton>
          <PosterStripSkeleton count={6} />
        </SectionBodySkeleton>
      </SectionShell>

      <SectionShell>
        <SectionHeadingSkeleton />
        <SectionBodySkeleton>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <ListCardSkeleton key={index} />
            ))}
          </div>
        </SectionBodySkeleton>
      </SectionShell>

      <SectionShell>
        <SectionHeadingSkeleton />
        <SectionBodySkeleton>
          <PosterStripSkeleton count={6} />
        </SectionBodySkeleton>
      </SectionShell>

      <SectionShell>
        <SectionHeadingSkeleton />
        <SectionBodySkeleton>
          <div className="flex flex-col">
            {Array.from({ length: 2 }).map((_, index) => (
              <ReviewCardSkeleton key={index} />
            ))}
          </div>
        </SectionBodySkeleton>
      </SectionShell>
    </div>
  );
}

function CollectionPageSkeleton({ filterCount = 5, itemCount = 12 }) {
  return (
    <div className="flex flex-col">
      <SectionShell>
        <SectionBodySkeleton>
          <FilterBarSkeleton triggerCount={Math.max(0, filterCount - 1)} withSearch={true} />
          <PosterGridSkeleton count={itemCount} />
          <PaginationSkeleton />
        </SectionBodySkeleton>
      </SectionShell>
    </div>
  );
}

function CollectionSkeleton() {
  return <CollectionPageSkeleton filterCount={5} itemCount={12} />;
}

function ReviewsSkeleton() {
  return (
    <div className="flex flex-col">
      <SectionShell>
        <SectionBodySkeleton className="py-0">
          <FilterBarSkeleton triggerCount={4} withSearch={false} />
          <div className={cn('account-review-list-frame')}>
            {Array.from({ length: 4 }).map((_, index) => (
              <ReviewCardSkeleton key={index} />
            ))}
          </div>

          <div className="flex justify-center">
            <Pill className="h-11 w-36" soft={true} />
          </div>
        </SectionBodySkeleton>
      </SectionShell>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex flex-col">
      <SectionShell>
        <SectionBodySkeleton className="py-0">
          <FilterBarSkeleton flush={true} triggerCount={2} withSearch={false} />
          <div>
            {Array.from({ length: 5 }).map((_, index) => (
              <ActivityItemSkeleton key={index} isFirst={index === 0} />
            ))}
          </div>
        </SectionBodySkeleton>
      </SectionShell>
    </div>
  );
}

function ListsSkeleton() {
  return (
    <div className="flex flex-col">
      <SectionShell>
        <SectionBodySkeleton>
          <FilterBarSkeleton triggerCount={1} withSearch={false} />
          <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ListCardSkeleton key={index} />
            ))}
          </div>
          <PaginationSkeleton />
        </SectionBodySkeleton>
      </SectionShell>
    </div>
  );
}

function ListDetailSkeleton() {
  return (
    <div className="flex flex-col">
      <SectionShell>
        <SectionBodySkeleton>
          <ListDetailHeaderSkeleton />
        </SectionBodySkeleton>
      </SectionShell>

      <SectionShell>
        <SectionBodySkeleton>
          <FilterBarSkeleton triggerCount={4} withSearch={true} />
          <PosterGridSkeleton count={12} compact={true} />
          <PaginationSkeleton />
        </SectionBodySkeleton>
      </SectionShell>

      <SectionShell>
        <SectionBodySkeleton>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-2">
              <SkeletonCircle className="size-8" soft={true} />
              <Line className="h-4 w-28" />
            </div>
            <Pill className="h-9 w-28" soft={true} />
          </div>
          <div className="flex w-full flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Line className="h-3.5 w-36" />
              <Line className="h-3 w-64 max-w-full" soft={true} />
            </div>
            <Pill className="h-10 w-full sm:w-36" soft={true} />
          </div>
          <ReviewCardSkeleton />
        </SectionBodySkeleton>
      </SectionShell>
    </div>
  );
}

function EditSkeleton() {
  return (
    <div className="flex flex-col">
      <SectionShell>
        <SectionHeadingSkeleton summary={false} seeMore={false} />
        <SectionBodySkeleton>
          <div className="flex gap-2">
            <Pill className="h-9 w-32" />
            <Pill className="h-9 w-28" soft={true} />
          </div>
        </SectionBodySkeleton>
      </SectionShell>

      <SectionShell>
        <SectionHeadingSkeleton summary={false} seeMore={false} />
        <SectionBodySkeleton>
          <div className="grid gap-4 md:grid-cols-2">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <FormFieldSkeleton tall={true} />
            <FormFieldSkeleton />
          </div>
          <MediaFieldSkeleton />
          <MediaFieldSkeleton large={true} />
        </SectionBodySkeleton>
      </SectionShell>

      <SectionShell>
        <SectionHeadingSkeleton summary={false} seeMore={false} />
        <SectionBodySkeleton>
          <div className="grid gap-4 md:grid-cols-2">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
          </div>
          <div className="flex gap-2">
            <Pill className="h-10 w-32" soft={true} />
            <Pill className="h-10 w-40" soft={true} />
          </div>
        </SectionBodySkeleton>
      </SectionShell>
    </div>
  );
}

function ListBuilderSkeleton() {
  return (
    <div>
      <SectionShell>
        <SectionBodySkeleton>
          <SkeletonBlock className="overflow-hidden" soft={true}>
            <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
              <section className="flex min-h-0 flex-col">
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <FormFieldSkeleton />
                    <FormFieldSkeleton />
                  </div>

                  <div className="mt-4">
                    <ToolbarSkeleton firstWidth="sm:w-48" secondWidth="sm:w-32" withSearch={true} />
                  </div>
                </div>

                <div className="flex-1 p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Poster key={index} />
                    ))}
                  </div>
                </div>
              </section>

              <aside className="flex min-h-0 flex-col p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 pb-4">
                  <Line className="h-3 w-28" />
                  <Pill className="h-8 w-14" soft={true} />
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <SkeletonBlock key={index} className="flex items-center gap-3 p-2.5" soft={true}>
                      <Line className="h-3 w-4" soft={true} />
                      <SkeletonPoster className="aspect-auto h-16 w-11 shrink-0" radius="field" />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <Line className="h-3 w-4/5" />
                        <Line className="h-2.5 w-1/2" soft={true} />
                      </div>
                      <Pill className="size-8" soft={true} />
                    </SkeletonBlock>
                  ))}
                </div>
              </aside>
            </div>
          </SkeletonBlock>
        </SectionBodySkeleton>
      </SectionShell>
    </div>
  );
}

export function renderAccountSkeletonVariant(variant) {
  switch (variant) {
    case 'activity':
      return <ActivitySkeleton />;
    case 'collection':
      return <CollectionSkeleton />;
    case 'edit':
      return <EditSkeleton />;
    case 'list-builder':
      return <ListBuilderSkeleton />;
    case 'list-detail':
      return <ListDetailSkeleton />;
    case 'lists':
      return <ListsSkeleton />;
    case 'reviews':
      return <ReviewsSkeleton />;
    case 'overview':
    default:
      return <OverviewSkeleton />;
  }
}
