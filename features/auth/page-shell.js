'use client';

import { AppRouteItem, AppRouteSection, AppRouteShell } from '@/app/motion';
import { useRegistry } from '@/core/modules/registry';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';

export function AuthRouteRegistry({ authIsReady, description, icon, title }) {
  useRegistry({
    nav: {
      title,
      description,
      icon,
      action: null,
    },
    loading: { isLoading: !authIsReady },
  });

  return null;
}

export default function AuthPageShell({ children, title }) {
  return (
    <>
      <PageGradientShell className="overflow-hidden" contentClassName="account-detail-grid-content isolate">
        <AppRouteShell
          as="main"
          className="auth-detail-viewport relative grid min-h-dvh place-items-center overflow-hidden px-4 py-20 max-[420px]:min-h-svh max-[420px]:px-0 max-[420px]:py-10"
        >
          <AppRouteItem
            as="span"
            aria-hidden="true"
            className="auth-detail-wrapper-line auth-detail-wrapper-line-left"
            index={0}
          />
          <AppRouteItem
            as="span"
            aria-hidden="true"
            className="auth-detail-wrapper-line auth-detail-wrapper-line-right"
            index={1}
          />
          <AppRouteSection className="auth-detail-panel relative z-10 w-full" index={0}>
            <AppRouteItem className="auth-detail-header mb-5 flex flex-col items-center text-center sm:mb-8" index={0}>
              <h1 className="text-3xl font-semibold text-balance sm:text-4xl">{title}</h1>
            </AppRouteItem>
            <AppRouteItem className="auth-detail-form-surface mx-auto w-full" index={1}>
              {children}
            </AppRouteItem>
          </AppRouteSection>
        </AppRouteShell>
      </PageGradientShell>
    </>
  );
}
