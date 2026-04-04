'use client';

import Icon from '@/ui/icon';

export default function AccountBioSurface({ description = '', onClose = null, title = 'About' }) {
  return (
    <section className={`rounded-[12px] border border-[#0369a1] bg-[#bae6fd] p-2`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-bold tracking-wide text-[#0c4a6e] uppercase`}>{title}</p>
        </div>
        <button
          type="button"
          onClick={() => onClose?.()}
          className={`center cursor-pointer rounded-full border border-[#be123c] bg-[#fecdd3] p-1 text-[#881337] transition-all`}
          aria-label="Close bio"
        >
          <Icon icon="material-symbols:close-rounded" size={24} />
        </button>
      </div>
      <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap text-[#1e293b]`}>{description}</p>
    </section>
  );
}
