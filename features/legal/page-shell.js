import Link from 'next/link';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';

function Section({ children, title }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-black sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-black/72 sm:text-[15px]">{children}</div>
    </section>
  );
}

export function LegalPageShell({ children, description, lastUpdated, title }) {
  return (
    <PageGradientShell className="overflow-hidden">
      <div
        className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-10 px-4 pt-24 pb-20 sm:px-6 sm:pt-28`}
      >
        <header className="max-w-3xl space-y-4">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-black/48 uppercase">Legal</p>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-black/68 sm:text-[15px]">{description}</p>
          </div>
          <p className="text-xs tracking-wide text-black/44 uppercase">Last updated {lastUpdated}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <article className="bg-primary space-y-8 border border-black/5 p-6 sm:p-8">{children}</article>

          <aside className="p-5 text-sm leading-7 text-black/70">
            <p className="font-semibold text-black">Quick links</p>
            <div className="mt-3 flex flex-col gap-2">
              <Link className="transition hover:text-black" href="/privacy">
                Privacy Policy
              </Link>
              <Link className="transition hover:text-black" href="/terms">
                Terms of Service
              </Link>
              <a className="transition hover:text-black" href="mailto:tvizzie.app@gmail.com">
                tvizzie.app@gmail.com
              </a>
            </div>
          </aside>
        </div>
      </div>
    </PageGradientShell>
  );
}

export { Section as LegalSection };
