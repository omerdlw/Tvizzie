'use client';

import { useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { isRegistryDebugPanelEnabled, isRegistryHistoryCaptureEnabled } from '@/config/project.config';
import { AuthInteractiveBoundary, InteractiveFeatureBoundary } from '@/features/layout/interactive-boundary';
import { MotionRuntimeProvider } from '@/features/motion-runtime';
import { NAV_CONFIG } from '@/config/nav.config';
import { pipe } from '@/core/utils';
import { SmoothScrollProvider } from '@/features/layout/smooth-scroll';

import { BackgroundOverlay, BackgroundProvider } from '@/core/modules/background';
import { GlobalError } from '@/core/modules/error-boundary';
import { LoadingOverlay, LoadingProvider } from '@/core/modules/loading';
import { NavigationProvider } from '@/core/modules/nav/context';
import { RegistryProvider } from '@/core/modules/registry/context';
import { RegistryDebugPanel } from '@/core/modules/registry/debug-panel';

const CoreShellProviders = pipe(
  [RegistryProvider, { enableHistory: isRegistryHistoryCaptureEnabled() }],
  [BackgroundProvider],
  [NavigationProvider, { config: NAV_CONFIG }],
  [LoadingProvider]
);

function shouldEnableInteractiveBoundary(pathname = '/') {
  return resolveInteractiveBoundaryVariant(pathname) !== 'none';
}

function resolveInteractiveBoundaryVariant(pathname = '/') {
  return (
    pathname === '/' ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/movie/') ||
    pathname.startsWith('/person/') ||
    pathname.startsWith('/account')
  )
    ? 'full'
    : pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')
      ? 'auth'
      : 'none';
}

function renderInteractiveBoundary(children, variant) {
  if (variant === 'full') {
    return <InteractiveFeatureBoundary>{children}</InteractiveFeatureBoundary>;
  }

  if (variant === 'auth') {
    return <AuthInteractiveBoundary>{children}</AuthInteractiveBoundary>;
  }

  return children;
}

function shouldEnableSmoothScroll(pathname = '/') {
  return resolveInteractiveBoundaryVariant(pathname) === 'full';
}

export const AppProviders = ({ children }) => {
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const showRegistryDebugPanel = isRegistryDebugPanelEnabled();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const interactiveBoundaryVariant = resolveInteractiveBoundaryVariant(pathname);
  const needsInteractiveBoundary = shouldEnableInteractiveBoundary(pathname);
  const needsSmoothScroll = shouldEnableSmoothScroll(pathname);

  const content = needsInteractiveBoundary ? renderInteractiveBoundary(children, interactiveBoundaryVariant) : children;

  const contentWithEnhancements = needsSmoothScroll ? <SmoothScrollProvider>{content}</SmoothScrollProvider> : content;

  return (
    <MotionRuntimeProvider>
      <CoreShellProviders>
        {isHydrated && showRegistryDebugPanel ? <RegistryDebugPanel /> : null}
        <BackgroundOverlay />
        <LoadingOverlay />
        <GlobalError>{contentWithEnhancements}</GlobalError>
      </CoreShellProviders>
    </MotionRuntimeProvider>
  );
};
