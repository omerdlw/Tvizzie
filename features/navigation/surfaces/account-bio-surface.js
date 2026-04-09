'use client';

import Icon from '@/ui/icon';

export default function AccountBioSurface({ description = '', onClose = null, title = 'About' }) {
  return (
    <section className={`bg-primary/40 rounded-[12px] border border-black/5`}>
      <div className="flex items-center justify-between gap-3 border-b border-black/5 p-3">
        <div className="min-w-0">
          <p className={`text-sm font-bold tracking-wide uppercase`}>{title}</p>
        </div>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="bg-primary inline-flex size-8 items-center justify-center rounded-full border border-black/10 text-black/70 transition hover:bg-black/5 hover:text-black"
          aria-label="Close bio"
        >
          <Icon icon="material-symbols:close-rounded" size={16} />
        </button>
      </div>
      <p className={`p-3 text-sm leading-relaxed text-pretty whitespace-pre-wrap text-[#1e293b]`}>{description}</p>
    </section>
  );
}
