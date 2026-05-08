'use client';

import { PageGradientShell } from '@/ui/elements/page-gradient-shell';

export default function AuthPageShell({ children, title }) {
  return (
    <>
      <PageGradientShell className="overflow-hidden" contentClassName="account-detail-grid-content">
        <main className="auth-detail-viewport">
          <span aria-hidden="true" className="auth-detail-wrapper-line auth-detail-wrapper-line-left" />
          <span aria-hidden="true" className="auth-detail-wrapper-line auth-detail-wrapper-line-right" />
          <div className="auth-detail-panel">
            <div className="auth-detail-header flex flex-col items-center text-center">
              <h1 className="text-3xl font-semibold text-balance sm:text-4xl">{title}</h1>
            </div>
            <div className="auth-detail-form-surface">{children}</div>
          </div>
        </main>
      </PageGradientShell>
    </>
  );
}
