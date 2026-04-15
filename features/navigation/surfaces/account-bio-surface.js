'use client';

import Icon from '@/ui/icon';

export default function AccountBioSurface({ description = '', onClose = null, title = 'About' }) {
  const normalizedDescription = String(description || '').trim();

  return (
    <section className={`overflow-hidden rounded-[14px]`}>
      <div className="flex items-center justify-between gap-3 border-b border-black/5 p-3">
        <p className={`text-sm font-bold tracking-wide uppercase`}>{title}</p>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="bg-primary absolute top-0 right-0 inline-flex size-8 items-center justify-center rounded-full border border-black/10 text-black/70 transition hover:bg-black/5 hover:text-black"
          aria-label="Close bio"
        >
          <Icon icon="material-symbols:close-rounded" size={16} />
        </button>
      </div>
      <div className="max-h-[min(40dvh,18rem)] w-full overflow-y-auto p-3">
        <p className={`text-sm leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-black/70`}>
          {normalizedDescription}
        </p>
      </div>
    </section>
  );
}
