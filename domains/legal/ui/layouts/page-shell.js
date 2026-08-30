import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared';
import { NavHeightSpacer } from '@/modules/nav';

export const LEGAL_PAGE_CONTENT_CLASS = `relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col px-4 pb-20 sm:px-6`;

export function LegalSection({ children, title }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-white/70">{children}</div>
    </section>
  );
}

export function LegalDocument({ children }) {
  return (
    <article className="space-y-8 ring-1 ring-inset ring-white/5 p-6 sm:p-8">{children}</article>
  );
}

export default function LegalPageShell({ children }) {
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-1/2 z-0 w-full -translate-x-1/2 ${PAGE_SHELL_MAX_WIDTH_CLASS}`}
      >
        <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
        <div className="absolute inset-y-0 right-0 w-px bg-white/10" />
      </div>

      <div className="relative z-10">{children}</div>
      <NavHeightSpacer />
    </>
  );
}

export { LegalPageShell };
