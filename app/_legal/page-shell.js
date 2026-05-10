'use client';

import Link from 'next/link';

import { AppRouteItem, AppRouteSection, AppRouteShell } from '@/app/motion';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';

function Section({ children, title }) {
  return (
    <section className="space-y-3">
      <AppRouteItem index={0}>
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
      </AppRouteItem>
      <AppRouteItem className="legal-route-muted space-y-3 text-sm leading-7 sm:text-[15px]" index={1}>
        {children}
      </AppRouteItem>
    </section>
  );
}

export function LegalPageShell({ children, description, lastUpdated, title }) {
  return (
    <PageGradientShell className="overflow-hidden">
      <AppRouteShell
        className={`legal-grid-frame relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-10 px-4 pt-24 pb-20 sm:px-6 sm:pt-28`}
      >
        <AppRouteSection as="header" className="max-w-3xl space-y-4" index={0}>
          <AppRouteItem index={0}>
            <p className="legal-route-soft text-[11px] font-semibold tracking-widest uppercase">Legal</p>
          </AppRouteItem>
          <AppRouteItem className="space-y-3" index={1}>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
            <p className="legal-route-muted max-w-2xl text-sm leading-7 sm:text-[15px]">{description}</p>
          </AppRouteItem>
          <AppRouteItem index={2}>
            <p className="legal-route-soft text-xs tracking-wide uppercase">Last updated {lastUpdated}</p>
          </AppRouteItem>
        </AppRouteSection>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <AppRouteSection as="article" className="legal-route-panel space-y-8 p-6 sm:p-8" index={1}>
            {children}
          </AppRouteSection>

          <AppRouteSection as="aside" className="legal-route-muted p-5 text-sm leading-7" index={2}>
            <AppRouteItem index={0}>
              <p className="font-semibold text-white">Quick links</p>
            </AppRouteItem>
            <AppRouteItem className="mt-3 flex flex-col gap-2" index={1}>
              <Link className="hover:text-white" data-soft-hover="control" href="/privacy">
                Privacy Policy
              </Link>
              <Link className="hover:text-white" data-soft-hover="control" href="/terms">
                Terms of Service
              </Link>
              <a className="hover:text-white" data-soft-hover="control" href="mailto:tvizzie.app@gmail.com">
                tvizzie.app@gmail.com
              </a>
            </AppRouteItem>
          </AppRouteSection>
        </div>
      </AppRouteShell>
    </PageGradientShell>
  );
}

export { Section as LegalSection };
