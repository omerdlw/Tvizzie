'use client';

import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-primary inline-flex size-7 shrink-0 cursor-pointer items-center justify-center border border-black/10 text-black/70 transition-colors hover:bg-black/5 hover:text-black"
    >
      <Icon icon="material-symbols:close-rounded" size={18} />
    </button>
  );
}

export function ModalTitle({ title, close, titleId, placement = 'embedded', className, style }) {
  if (!title) {
    return null;
  }

  const isAttachedTop = placement === 'attached-top';
  const isAttachedBottom = placement === 'attached-bottom';

  return (
    <div
      className={cn(
        'bg-primary flex items-center justify-between gap-2 border border-black/10 px-3 py-2',
        placement === 'embedded' && 'w-full border-x-0 border-t-0',
        isAttachedTop && 'max-w-full[30px] border-b-0',
        isAttachedBottom && 'max-w-full border-t-0',
        className
      )}
      style={style}
    >
      <div className="min-w-0 flex-1 px-1 sm:px-2">
        <h2 id={titleId} className="text-base font-semibold tracking-wide text-black">
          {title}
        </h2>
      </div>

      <CloseButton onClick={close} />
    </div>
  );
}
