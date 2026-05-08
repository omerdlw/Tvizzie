'use client';

import { RouteGridDivider, RouteGridFrame } from '@/ui/elements/route-grid-frame';

export function AccountGridFrame({ children, className = '', routeKey = null }) {
  return (
    <RouteGridFrame
      baseDelay={0.22}
      className={className}
      frameClassName="account-detail-grid-frame"
      lineClassName="account-detail-grid-frame-line"
      routeKey={routeKey}
    >
      {children}
    </RouteGridFrame>
  );
}

export function AccountGridDivider({ className = '' }) {
  return (
    <RouteGridDivider
      className={className}
      dividerClassName="account-detail-grid-divider"
      lineClassName="account-detail-grid-divider-line"
      patternClassName="account-detail-grid-divider-pattern"
      startCapClassName="account-detail-grid-divider-startcap"
      startCapContent={
        <span className="account-detail-grid-divider-diamond account-detail-grid-divider-diamond-start" />
      }
      endCapClassName="account-detail-grid-divider-endcap"
      endCapContent={<span className="account-detail-grid-divider-diamond account-detail-grid-divider-diamond-end" />}
    />
  );
}
