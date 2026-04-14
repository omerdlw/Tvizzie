import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { FullscreenState } from '@/ui/states/fullscreen-state';

const BLOCK_SOFT = 'skeleton-block-soft';
const BLOCK = 'skeleton-block';

function Heading({ width = 'w-32' }) {
  return <div className={`h-3 ${width} rounded-full ${BLOCK}`} />;
}

function TextLine({ width = 'w-full' }) {
  return <div className={`h-4 ${width} rounded-full ${BLOCK}`} />;
}

function SegmentTabs() {
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className={`h-6 w-16 rounded-[9px] ${BLOCK}`} />
      <div className={`h-6 w-14 rounded-[9px] ${BLOCK_SOFT}`} />
      <div className={`h-6 w-14 rounded-[9px] ${BLOCK_SOFT}`} />
    </div>
  );
}

function CastCard() {
  return (
    <div className={`flex items-center gap-2 rounded-[14px] p-1 pr-4 ${BLOCK_SOFT}`}>
      <div className={`h-20 w-16 shrink-0 rounded-[10px] ${BLOCK}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className={`h-3 w-2/3 rounded-full ${BLOCK}`} />
        <div className={`h-2.5 w-1/2 rounded-full ${BLOCK}`} />
      </div>
    </div>
  );
}

function LandscapeCarouselStrip() {
  return (
    <div className="flex w-full items-start gap-3 overflow-hidden">
      <div className={`h-40 w-72 shrink-0 rounded-[14px] ${BLOCK}`} />
      <div className={`h-40 w-72 shrink-0 rounded-[14px] ${BLOCK}`} />
      <div className={`h-40 w-20 shrink-0 rounded-[14px] ${BLOCK}`} />
    </div>
  );
}

function PosterCarouselStrip() {
  return (
    <div className="flex w-full items-start gap-3 overflow-hidden">
      <div className={`h-52 w-36 shrink-0 rounded-[14px] ${BLOCK}`} />
      <div className={`h-52 w-36 shrink-0 rounded-[14px] ${BLOCK}`} />
      <div className={`h-52 w-36 shrink-0 rounded-[14px] ${BLOCK}`} />
      <div className={`h-52 w-36 shrink-0 rounded-[14px] ${BLOCK}`} />
      <div className={`h-52 w-16 shrink-0 rounded-[14px] ${BLOCK}`} />
    </div>
  );
}

function SidebarStat() {
  return (
    <div className="flex items-center gap-2">
      <div className={`size-3 rounded-md ${BLOCK}`} />
      <div className={`h-3 w-40 rounded-full ${BLOCK}`} />
    </div>
  );
}

function MovieContentSkeleton() {
  return (
    <div
      className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-3 pb-12 [overflow-anchor:none] sm:gap-8 sm:px-4 md:px-6`}
    >
      <div className="mt-6 flex w-full flex-col items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-20 lg:flex-row lg:gap-12">
        <div className="w-full shrink-0 self-start lg:w-[400px]">
          <div className="flex w-full flex-col gap-3">
            <div className={`h-[580px] w-full rounded-[14px] ${BLOCK}`} />
            <div className="grid grid-cols-2 gap-2">
              <div className={`h-[42px] rounded-[14px] ${BLOCK_SOFT}`} />
              <div className={`h-[42px] rounded-[14px] ${BLOCK_SOFT}`} />
            </div>
            <div className={`h-[42px] rounded-[14px] ${BLOCK_SOFT}`} />
            <div className="mt-2 flex flex-col gap-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <SidebarStat key={index} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col">
          <div className="flex w-full flex-col">
            <div className="flex items-end justify-between gap-3">
              <div className={`h-20 w-[52%] rounded-[14px] ${BLOCK}`} />
              <div className={`h-6 w-24 rounded-full ${BLOCK_SOFT}`} />
            </div>

            <div className="mt-4">
              <TextLine width="w-4/5" />
            </div>

            <div className="mt-4 flex max-w-[72ch] flex-col gap-2">
              <TextLine />
              <TextLine width="w-[95%]" />
              <TextLine width="w-[88%]" />
              <TextLine width="w-[74%]" />
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <Heading width="w-24" />
                <div className={`h-3 w-16 rounded-full ${BLOCK}`} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <CastCard key={index} />
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <Heading width="w-20" />
              <LandscapeCarouselStrip />
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <SegmentTabs />
              <LandscapeCarouselStrip />
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <SegmentTabs />
              <LandscapeCarouselStrip />
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <Heading width="w-28" />
              <PosterCarouselStrip />
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <Heading width="w-28" />
              <PosterCarouselStrip />
            </div>

            <div className="mt-10 flex flex-col gap-4 pb-16">
              <div className="flex items-center justify-between gap-3">
                <Heading width="w-36" />
                <div className={`h-6 w-16 rounded-full ${BLOCK_SOFT}`} />
              </div>
              <div className={`h-14 rounded-[14px] ${BLOCK_SOFT}`} />
              <div className={`h-10 w-48 rounded-full ${BLOCK_SOFT}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Skeleton() {
  return (
    <FullscreenState
      affectGlobalState={false}
      className="h-screen w-screen"
      contentClassName="h-screen w-screen !block !p-0 overflow-y-auto"
    >
      <MovieContentSkeleton />
    </FullscreenState>
  );
}

export default Skeleton;
