'use client';

import { GridPageAnimationRoot, GridPageLine, GridPageNode } from '@/ui/animations/grid-page-animation';
import { cn } from '@/ui/elements/utils';

const ACCOUNT_GRID_TIMELINE = Object.freeze({
  durations: Object.freeze({
    line: 4.8,
    node: 1.12,
  }),
  frame: Object.freeze({
    left: 0.1,
    right: 0.56,
  }),
  divider: Object.freeze({
    leading: 0.28,
    trailing: 0.68,
    pattern: 0.94,
    node: 1.18,
  }),
});

export function AccountGridFrame({ children, className = '', routeKey = null }) {
  return (
    <GridPageAnimationRoot baseDelay={0.22} routeKey={routeKey}>
      <div className={cn('account-detail-grid-frame account-detail-grid-frame-animated relative', className)}>
        {children}
        <GridPageLine
          axis="y"
          className="account-detail-grid-frame-line account-detail-grid-frame-line-left"
        />
        <GridPageLine
          axis="y"
          className="account-detail-grid-frame-line account-detail-grid-frame-line-right"
        />
      </div>
    </GridPageAnimationRoot>
  );
}

export function AccountGridDivider({ className = '' }) {
  return (
    <div
      className={cn('account-detail-grid-divider account-detail-grid-divider-animated', className)}
      aria-hidden="true"
    >
      <GridPageLine
        axis="x"
        className="account-detail-grid-divider-line account-detail-grid-divider-line-top"
      />
      <GridPageLine
        axis="x"
        className="account-detail-grid-divider-line account-detail-grid-divider-line-bottom"
      />
      <GridPageLine
        axis="x"
        className="account-detail-grid-divider-pattern"
      />
      <GridPageNode
        className="account-detail-grid-divider-startcap"
      >
        <span className="account-detail-grid-divider-diamond account-detail-grid-divider-diamond-start" />
      </GridPageNode>
      <GridPageNode
        className="account-detail-grid-divider-endcap"
      >
        <span className="account-detail-grid-divider-diamond account-detail-grid-divider-diamond-end" />
      </GridPageNode>
    </div>
  );
}
