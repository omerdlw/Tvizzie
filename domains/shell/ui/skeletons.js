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
      className="flex items-center gap-3 border-b border-white/10 p-3 last:border-none lg:p-4"
    >
      <div className="size-10 shrink-0 bg-white/5" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-3/5 bg-white/5" />
        <div className="h-2 w-2/5 bg-white/5" />
      </div>
    </div>
  ));
}

export function ListPickerSkeleton({ count = 10 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="flex h-24 items-center gap-2 border border-white/5 p-3"
        >
          <div className="relative h-[68px] w-[82px] shrink-0">
            {[0, 1, 2, 3].map((stackIndex) => (
              <div
                key={`stack-${index}-${stackIndex}`}
                className={`absolute bottom-0 overflow-hidden border border-white/5 ${
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
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="skeleton-block h-4 w-2/5" />
            <div className="skeleton-block-soft h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
