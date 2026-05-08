'use client';

import { GridPageAnimationRoot, GridPageLine, GridPageNode } from '@/ui/animations/grid-page-animation';
import { cn } from '@/ui/elements/utils';

export function RouteGridFrame({
  baseDelay = 0.12,
  children,
  className = '',
  frameClassName = 'route-grid-frame',
  lineClassName = 'route-grid-frame-line',
  routeKey = null,
}) {
  return (
    <GridPageAnimationRoot baseDelay={baseDelay} routeKey={routeKey}>
      <div className={cn(frameClassName, 'route-grid-frame-managed relative', className)}>
        {children}
        <GridPageLine className={cn(lineClassName, `${lineClassName}-left`)} />
        <GridPageLine className={cn(lineClassName, `${lineClassName}-right`)} />
      </div>
    </GridPageAnimationRoot>
  );
}

export function RouteGridDivider({
  capClassName = '',
  className = '',
  dividerClassName = 'route-grid-divider',
  endCapClassName = '',
  endCapContent = null,
  inset = false,
  insetClassName = 'route-grid-divider-inset',
  lineClassName = 'route-grid-divider-line',
  patternClassName = 'route-grid-divider-pattern',
  startCapClassName = '',
  startCapContent = null,
  style = undefined,
}) {
  const hasCaps = startCapContent || endCapContent || startCapClassName || endCapClassName;

  return (
    <div
      className={cn(
        dividerClassName,
        {
          [insetClassName]: inset,
        },
        className
      )}
      style={style}
      aria-hidden="true"
    >
      <GridPageLine axis="x" className={cn(lineClassName, `${lineClassName}-top`)} />
      <GridPageLine axis="x" className={cn(lineClassName, `${lineClassName}-bottom`)} />
      <GridPageLine axis="x" className={patternClassName} />
      {hasCaps ? (
        <>
          <GridPageNode className={cn(capClassName, startCapClassName)}>{startCapContent}</GridPageNode>
          <GridPageNode className={cn(capClassName, endCapClassName)}>{endCapContent}</GridPageNode>
        </>
      ) : null}
    </div>
  );
}
