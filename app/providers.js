'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { MotionConfig } from 'framer-motion';

import { isReservedAccountSegment } from '@/shared';

import { NAV_RUNTIME } from '@/app/_shell/nav-runtime';
import { NAV_CONFIG } from '@/app/_shell/navigation-config';
import { SmoothScrollProvider } from '@/app/_shell/smooth-scroll';
import { composeProviders } from '@/app/_shell/compose-providers';

import { BackgroundOverlay, BackgroundProvider } from '@/modules/background';
import {
  AuthProvider,
  createSupabaseAuthAdapter,
  useAuth,
  useAuthSessionReady,
} from '@/modules/auth';
import { getUserAvatarUrl } from '@/domains/account/utils/avatar';
import { subscribeToUserAccount } from '@/domains/account/client/profile';
import { getRealtimeTransportMode } from '@/infrastructure/realtime/client';
import {
  createConsoleHandler,
  createSentryHandler,
  getErrorReporter,
  GlobalError,
  GlobalErrorListener,
} from '@/modules/error-boundary';
import { LoadingOverlay, LoadingProvider } from '@/modules/loading';
import { ModalProvider } from '@/modules/modal';
import { createSurfaceFlowDefinition, NavigationProvider } from '@/modules/nav';
import { useNavigationActions } from '@/modules/nav';
import {
  NotificationContainer,
  NotificationListener,
  NotificationProvider,
  useToast,
} from '@/modules/notification';
import { resolveSignInNoticeToast, sanitizeNextPath } from '@/domains/auth/utils/routes';
import { createSignInSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-in-surface';
import { createSignUpSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-up-surface';
import {
  REGISTRY_KEYS,
  REGISTRY_SOURCES,
  REGISTRY_TYPES,
  RegistryProvider,
  useNavRegistration,
} from '@/modules/registry';
import {
  createClient as createSupabaseClient,
  terminateBrowserSession,
} from '@/infrastructure/supabase/client';
const Nav = dynamic(() => import('@/modules/nav'));
const NotificationsModal = dynamic(() => import('@/domains/shell/modals/notifications-modal'), {
  ssr: false,
});
const STATIC_NAV_ITEMS = Object.freeze(
  Object.fromEntries(
    Object.values(NAV_CONFIG.items)
      .filter((item) => item.path !== '/account')
      .map((item) => [item.path || item.name, item]),
  ),
);

const APP_REGISTRY_ENTRIES = Object.freeze([
  {
    type: REGISTRY_TYPES.NAV,
    items: STATIC_NAV_ITEMS,
  },
  {
    type: REGISTRY_TYPES.NAV_RUNTIME,
    items: {
      [REGISTRY_KEYS.NAV_RUNTIME]: {
        ...NAV_RUNTIME,
        integrations: NAV_CONFIG.integrations,
      },
    },
  },
  {
    type: REGISTRY_TYPES.MODAL,
    items: {
      NOTIFICATIONS_MODAL: NotificationsModal,
    },
  },
]);

const APP_AUTH_CONFIG = {
  adapter: createSupabaseAuthAdapter({
    client: () => createSupabaseClient(),
    oauthCallbackPath: '/api/auth/callback',
    oauthDefaultNextPath: '/account',
    terminateBrowserSession,
  }),
  hydrateFromStorage: false,
  persistSession: false,
};

const APP_BREADCRUMB_SECTIONS = Object.freeze({
  activity: { icon: 'solar:bolt-bold', title: 'Activity' },
  diary: { icon: 'solar:calendar-mark-bold', title: 'Diary' },
  edit: { icon: 'solar:pen-new-square-bold', title: 'Edit Profile' },
  likes: { icon: 'solar:heart-bold', title: 'Likes' },
  lists: { icon: 'solar:list-bold', title: 'Lists' },
  reviews: { icon: 'solar:chat-round-bold', title: 'Reviews' },
  terms: { icon: null, title: 'Terms of Service' },
  privacy: { icon: null, title: 'Privacy Policy' },
  watched: { icon: 'solar:eye-bold', title: 'Watched' },
  watchlist: { icon: 'solar:bookmark-bold', title: 'Watchlist' },
});

function formatBreadcrumbSegment(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const APP_BREADCRUMB_CONFIG = Object.freeze({
  root: Object.freeze({
    icon: NAV_CONFIG.items.home.icon,
    title: NAV_CONFIG.items.home.title,
  }),
  resolvePath: ({ overrides, segments }) => {
    const [route, subject, section, item] = segments;
    const resolveOverride = (path, fallback) => ({ ...fallback, ...(overrides[path] || {}) });

    if (route === 'account') {
      if (!subject) {
        return [
          resolveOverride('/account', {
            icon: 'solar:user-circle-bold',
            id: 'account',
            isCurrent: true,
            level: 1,
            path: '/account',
            title: 'Account',
          }),
        ];
      }

      if (subject === 'edit') {
        return [
          {
            icon: 'solar:user-circle-bold',
            id: 'account',
            isCurrent: false,
            level: 1,
            path: '/account',
            title: 'Account',
          },
          resolveOverride('/account/edit', {
            icon: 'solar:pen-new-square-bold',
            id: 'account-edit',
            isCurrent: true,
            level: 2,
            path: '/account/edit',
            title: 'Edit Profile',
          }),
        ];
      }

      const subjectPath = `/account/${subject}`;
      const breadcrumbs = [
        resolveOverride(subjectPath, {
          icon: 'solar:user-circle-bold',
          id: `user-${subject}`,
          isCurrent: !section,
          level: 1,
          path: subjectPath,
          title: `@${subject}`,
        }),
      ];
      if (!section) return breadcrumbs;

      const sectionPath = `${subjectPath}/${section}`;
      breadcrumbs.push(
        resolveOverride(sectionPath, {
          icon: APP_BREADCRUMB_SECTIONS[section]?.icon || null,
          id: `section-${section}`,
          isCurrent: !item,
          level: 2,
          path: sectionPath,
          title: APP_BREADCRUMB_SECTIONS[section]?.title || formatBreadcrumbSegment(section),
        }),
      );
      if (!item) return breadcrumbs;

      const itemPath = `${sectionPath}/${item}`;
      breadcrumbs.push(
        resolveOverride(itemPath, {
          icon: null,
          id: `item-${item}`,
          isCurrent: true,
          level: 3,
          path: itemPath,
          title: formatBreadcrumbSegment(item),
        }),
      );
      return breadcrumbs;
    }

    if (['movie', 'tv', 'person'].includes(route) && subject) {
      const mediaPath = `/${route}/${subject}`;
      const title = route === 'movie' ? 'Movie' : route === 'tv' ? 'TV Show' : 'Person';
      const icon = route === 'person' ? 'solar:user-rounded-bold' : 'solar:clapperboard-play-bold';
      const breadcrumbs = [
        resolveOverride(mediaPath, {
          icon,
          id: `${route}-${subject}`,
          isCurrent: !section,
          level: 1,
          path: mediaPath,
          title,
        }),
      ];
      if (section !== 'reviews') return breadcrumbs;
      const reviewPath = `${mediaPath}/reviews`;
      breadcrumbs.push(
        resolveOverride(reviewPath, {
          icon: 'solar:chat-round-bold',
          id: `${route}-${subject}-reviews`,
          isCurrent: true,
          level: 2,
          path: reviewPath,
          title: 'Reviews',
        }),
      );
      return breadcrumbs;
    }

    return null;
  },
});

const AUTH_SURFACE_FLOWS = Object.freeze({
  'sign-in': createSurfaceFlowDefinition({
    id: 'auth-sign-in',
    createSurface: ({ input }) => createSignInSurfaceEntry(input || {}),
  }),
  'sign-up': createSurfaceFlowDefinition({
    id: 'auth-sign-up',
    createSurface: ({ input }) => createSignUpSurfaceEntry(input || {}),
  }),
});

function shouldKeepAccountCardWhenDescendant(activePath) {
  const targetSegment = String(activePath || '')
    .split('/')
    .filter(Boolean)[1];
  return Boolean(targetSegment && !isReservedAccountSegment(targetSegment));
}

const CoreShellProviders = composeProviders(
  [RegistryProvider, { initialEntries: APP_REGISTRY_ENTRIES }],
  [BackgroundProvider],
  [NavigationProvider, { breadcrumbConfig: APP_BREADCRUMB_CONFIG }],
  [LoadingProvider],
  [AuthProvider, { config: APP_AUTH_CONFIG }],
  [ModalProvider],
  [NotificationProvider],
);

function resolveSentryGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Sentry || null;
}

function ObservabilityBootstrap() {
  useEffect(() => {
    const reporter = getErrorReporter({
      sampleRate: Number(process.env.NEXT_PUBLIC_ERROR_SAMPLE_RATE || 1),
    });
    const hasHandler = (name) => reporter.handlers.some((handler) => handler.name === name);

    if (!hasHandler('console')) {
      reporter.addHandler(createConsoleHandler({ level: 'error' }));
    }

    const sentryGlobal = resolveSentryGlobal();

    if (sentryGlobal && !hasHandler('sentry')) {
      const sentryHandler = createSentryHandler(sentryGlobal);
      if (sentryHandler.name === 'sentry') {
        reporter.addHandler(sentryHandler);
      }
    }

    reporter.setTag('runtime', 'web');
    reporter.setTag('transport', getRealtimeTransportMode());
  }, []);

  return null;
}

function AccountRouteNavGuard() {
  const auth = useAuth();
  const userId = auth.isAuthenticated ? auth.user?.id || null : null;
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const unsubscribe = subscribeToUserAccount(userId, (nextProfile) => {
      if (nextProfile) {
        setProfile(nextProfile);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [userId]);

  const activeUser = profile || auth.user;
  const displayName =
    profile?.displayName ||
    profile?.display_name ||
    auth.user?.name ||
    auth.user?.displayName ||
    auth.user?.metadata?.display_name ||
    'Account';
  const rawUsername =
    profile?.username || auth.user?.metadata?.username || auth.user?.username || null;
  const username = rawUsername ? `@${String(rawUsername).replace(/^@/, '')}` : null;
  const avatarUrl = activeUser ? getUserAvatarUrl(activeUser) : NAV_CONFIG.items.profile.icon;

  const accountNavItem = useMemo(() => {
    const baseAccountNavItem = {
      ...NAV_CONFIG.items.profile,
      keepWhenDescendant: shouldKeepAccountCardWhenDescendant,
    };

    if (!auth.isAuthenticated) {
      return baseAccountNavItem;
    }

    return {
      ...baseAccountNavItem,
      title: displayName,
      description: username || baseAccountNavItem.description,
      icon: avatarUrl,
    };
  }, [auth.isAuthenticated, displayName, username, avatarUrl]);

  useNavRegistration(
    auth.isReady
      ? {
          ...accountNavItem,
          path: '/account',
        }
      : null,
    { source: REGISTRY_SOURCES.STATIC, priority: 100 },
  );

  return null;
}

function AuthSurfaceReturnBridge() {
  const { openSurfaceFlow } = useNavigationActions();
  const toast = useToast();

  useEffect(() => {
    const url = new URL(window.location.href);
    const authSurface = url.searchParams.get('auth');

    if (authSurface !== 'sign-in' && authSurface !== 'sign-up') return;

    const data = {
      email: url.searchParams.get('email') || '',
      identifier: url.searchParams.get('identifier') || '',
      next: sanitizeNextPath(url.searchParams.get('next')),
    };
    const notice = url.searchParams.get('notice');
    const provider = url.searchParams.get('provider');
    const noticeToast = resolveSignInNoticeToast(notice, provider);

    ['auth', 'email', 'identifier', 'next', 'notice', 'provider'].forEach((key) => {
      url.searchParams.delete(key);
    });
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);

    if (noticeToast) {
      toast[noticeToast.type]?.(noticeToast.message);
    }

    void openSurfaceFlow(AUTH_SURFACE_FLOWS[authSurface], data);
  }, [openSurfaceFlow, toast]);

  return null;
}

export const AppProviders = ({ children }) => {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipPrimitive.Provider
        delayDuration={150}
        skipDelayDuration={300}
        disableHoverableContent
      >
        <CoreShellProviders>
          <ObservabilityBootstrap />
          <GlobalErrorListener />
          <NotificationListener />
          <AccountRouteNavGuard />
          <AuthSurfaceReturnBridge />
          <BackgroundOverlay />
          <LoadingOverlay />
          <Nav />
          <NotificationContainer />
          <SmoothScrollProvider>
            <GlobalError>{children}</GlobalError>
          </SmoothScrollProvider>
        </CoreShellProviders>
      </TooltipPrimitive.Provider>
    </MotionConfig>
  );
};
