'use client';

import { useEffect, useMemo, useState } from 'react';

import { usePathname } from 'next/navigation';

import { MotionConfig, useReducedMotion } from 'framer-motion';

import { isRegistryDebugPanelEnabled, isRegistryHistoryCaptureEnabled } from '@/config/project.config';
import { InteractiveFeatureBoundary } from '@/features/layout/interactive-boundary';
import { NAV_CONFIG } from '@/config/nav.config';
import { SmoothScrollProvider } from '@/features/layout/smooth-scroll';
import { pipe } from '@/core/utils/pipe';
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
  return (
    pathname === '/' ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/movie/') ||
    pathname.startsWith('/person/') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up')
  );
}

function shouldEnableSmoothScroll(pathname = '/') {
  return pathname.startsWith('/movie/') || pathname.startsWith('/person/') || pathname.startsWith('/account');
}

export const AppProviders = ({ children }) => {
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const showRegistryDebugPanel = isRegistryDebugPanelEnabled();
  const shouldReduceMotion = useReducedMotion();
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const needsInteractiveBoundary = shouldEnableInteractiveBoundary(pathname);
  const needsSmoothScroll = shouldEnableSmoothScroll(pathname);

  const content = needsInteractiveBoundary ? (
    <InteractiveFeatureBoundary>{children}</InteractiveFeatureBoundary>
  ) : (
    children
  );

  const contentWithEnhancements = needsSmoothScroll ? <SmoothScrollProvider>{content}</SmoothScrollProvider> : content;

  return (
    <MotionConfig reducedMotion={shouldReduceMotion || prefersReducedMotion ? 'always' : 'never'}>
      <CoreShellProviders>
        {isHydrated && showRegistryDebugPanel ? <RegistryDebugPanel /> : null}
        <BackgroundOverlay />
        <LoadingOverlay />
        <GlobalError>{contentWithEnhancements}</GlobalError>
      </CoreShellProviders>
    </MotionConfig>
  );
};
