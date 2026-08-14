'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';

export const LEGAL_PAGE_CONTENT_CLASS = `relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col px-4 pb-20 sm:px-6`;

export default function LegalPageShell({ children }) {
  return (
    <PageGradientShell className="overflow-hidden">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-1/2 z-0 w-full -translate-x-1/2 ${PAGE_SHELL_MAX_WIDTH_CLASS}`}
      >
        <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
        <div className="absolute inset-y-0 right-0 w-px bg-white/10" />
      </div>

      <div className="relative z-10">{children}</div>
      <NavHeightSpacer />
    </PageGradientShell>
  );
}
