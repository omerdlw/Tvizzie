const STACK_SKELETON_CLASSES = Object.freeze([
  'skeleton-block',
  'skeleton-block-soft',
  'skeleton-block-soft',
  'skeleton-block-soft',
]);

export function NotificationListSkeleton({ count = 16 }) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className="flex animate-pulse items-center gap-3 border-b border-white/10 p-3 last:ring-0 lg:p-4"
    >
      <div className="skeleton-block size-10 shrink-0 rounded-[14px]" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="skeleton-block h-3 w-3/5 rounded-full" />
        <div className="skeleton-block-soft h-2.5 w-2/5 rounded-full" />
      </div>
    </div>
  ));
}

export function ListPickerSkeleton({ count = 8 }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="flex h-24 animate-pulse items-center gap-2.5 rounded-[20px] bg-white/5 p-2 ring-1 ring-white/5 ring-inset"
        >
          <div className="relative h-[68px] w-[82px] shrink-0">
            {[0, 1, 2, 3].map((stackIndex) => (
              <div
                key={`stack-${index}-${stackIndex}`}
                className={`absolute bottom-0 overflow-hidden rounded-[14px] ring-1 ring-white/5 ring-inset ${
                  STACK_SKELETON_CLASSES[stackIndex] || 'skeleton-block-soft'
                }`}
                style={{
                  position: 'absolute',
                  width: '46px',
                  height: `${68 - stackIndex * 6}px`,
                  left: `${stackIndex * 12}px`,
                  zIndex: 4 - stackIndex,
                }}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="skeleton-block h-4 w-2/5 rounded-full" />
            <div className="skeleton-block-soft h-3 w-4/5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
