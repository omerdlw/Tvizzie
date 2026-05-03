'use client';

import { PageGradientShell } from '@/ui/elements/page-gradient-shell';

export default function AuthPageShell({ children, title }) {
  return (
    <>
      <PageGradientShell className="overflow-hidden" contentClassName="account-detail-grid-content">
        <main className="auth-detail-viewport px-4 py-4 sm:px-6 sm:py-6">
          <div className="auth-detail-grid-frame">
            <div className="auth-detail-panel">
              <span aria-hidden="true" className="auth-detail-grid-plus auth-detail-grid-plus-top-start" />
              <span aria-hidden="true" className="auth-detail-grid-plus auth-detail-grid-plus-top-end" />
              <span aria-hidden="true" className="auth-detail-grid-plus auth-detail-grid-plus-bottom-start" />
              <span aria-hidden="true" className="auth-detail-grid-plus auth-detail-grid-plus-bottom-end" />
              <div className="auth-detail-header flex flex-col items-center text-center">
                <h1 className="text-3xl font-semibold text-balance sm:text-4xl">{title}</h1>
              </div>
              <div className="auth-detail-form-surface">{children}</div>
            </div>
          </div>
        </main>
      </PageGradientShell>
    </>
  );
}
