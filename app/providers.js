'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';

import { AuthInteractiveBoundary, InteractiveFeatureBoundary } from '@/features/app-shell/interactive-boundary';
import { MotionRuntimeProvider } from '@/features/motion-runtime';
import { NAV_CONFIG } from '@/config/nav.config';
import { pipe } from '@/core/utils';
import { SmoothScrollProvider } from '@/features/app-shell/smooth-scroll';

import { BackgroundOverlay, BackgroundProvider } from '@/core/modules/background';
import { GlobalError } from '@/core/modules/error-boundary';
import { LoadingOverlay, LoadingProvider } from '@/core/modules/loading';
import { NavigationProvider } from '@/core/modules/nav/context';
import { RegistryProvider } from '@/core/modules/registry/context';

const Nav = dynamic(() => import('@/core/modules/nav'));
const WEB_VITALS_ENDPOINT = '/api/observability/web-vitals';
const TRACKED_METRICS = new Set(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);

const CoreShellProviders = pipe(
  [RegistryProvider, { enableHistory: false }],
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

function sanitizeMetric(metric) {
  return {
    delta: Number(metric?.delta) || 0,
    id: String(metric?.id || '').slice(0, 120),
    name: String(metric?.name || '').slice(0, 40),
    navigationType: String(metric?.navigationType || '').slice(0, 40) || 'navigate',
    pathname: typeof window === 'undefined' ? null : window.location.pathname,
    rating: String(metric?.rating || '').slice(0, 40) || 'unknown',
    value: Number(metric?.value) || 0,
  };
}

function postWebVital(metric) {
  if (!TRACKED_METRICS.has(metric?.name)) {
    return;
  }

  const body = JSON.stringify(sanitizeMetric(metric));

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(WEB_VITALS_ENDPOINT, blob);
      return;
    }

    fetch(WEB_VITALS_ENDPOINT, {
      body,
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      method: 'POST',
    }).catch(() => null);
  } catch {
    // Web vitals reporting must stay non-blocking.
  }
}

function WebVitals() {
  useReportWebVitals(postWebVital);

  return null;
}

export const AppProviders = ({ children }) => {
  const pathname = usePathname();
  const interactiveBoundaryVariant = resolveInteractiveBoundaryVariant(pathname);
  const needsInteractiveBoundary = shouldEnableInteractiveBoundary(pathname);
  const needsSmoothScroll = false
  const shellChildren =
    interactiveBoundaryVariant === 'auth' ? (
      children
    ) : (
      <>
        <Nav />
        {children}
      </>
    );

  const content = needsInteractiveBoundary
    ? renderInteractiveBoundary(shellChildren, interactiveBoundaryVariant)
    : shellChildren;

  const contentWithEnhancements = needsSmoothScroll ? <SmoothScrollProvider>{content}</SmoothScrollProvider> : content;

  return (
    <MotionRuntimeProvider>
      <WebVitals />
      <CoreShellProviders>
        <BackgroundOverlay />
        <LoadingOverlay />
        <GlobalError>{contentWithEnhancements}</GlobalError>
      </CoreShellProviders>
    </MotionRuntimeProvider>
  );
};
