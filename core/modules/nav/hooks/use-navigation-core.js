'use client';

import { useCallback, useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useNavigationActions } from '../context';
import { useNavRuntimeRegistry } from '@/core/modules/registry';

import { NAV_EVENT_HANDLERS } from '../events';
import { checkGuards } from '../guards';
import { isSamePath } from '../utils';

function blurActiveElement() {
  if (typeof document === 'undefined') return;
  document.activeElement?.blur?.();
}

export function useNavigationCore() {
  const pathname = usePathname();
  const router = useRouter();
  const { closeSurface, openSurface } = useNavigationActions();
  const { createGuardSurface } = useNavRuntimeRegistry();
  const previousPathRef = useRef(pathname);

  const cancelNavigation = useCallback(() => {
    closeSurface({
      cancelled: true,
      reason: 'guard',
      success: false,
    });
  }, [closeSurface]);

  const openGuardConfirmation = useCallback(
    ({ href, from, message }) => {
      NAV_EVENT_HANDLERS.navigateStart(href, from);
      const confirmNavigation = () => {
        blurActiveElement();
        router.push(href);
        NAV_EVENT_HANDLERS.navigate(href, from);
      };
      const cancelNavigation = () => closeSurface({ cancelled: true, reason: 'guard', success: false });

      const surface = createGuardSurface?.({
        to: href,
        from,
        message: message || 'You have unsaved changes. Are you sure you want to leave this page?',
        onCancel: cancelNavigation,
        onConfirm: confirmNavigation,
      });

      if (surface) {
        openSurface(surface);
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Navigation] Missing NAV_RUNTIME createGuardSurface; using browser confirmation.');
      }

      if (typeof window !== 'undefined' && window.confirm(message || 'Are you sure you want to leave this page?')) {
        confirmNavigation();
      } else {
        cancelNavigation();
      }
    },
    [closeSurface, createGuardSurface, openSurface, router],
  );

  const navigate = useCallback(
    async (href, { force = false } = {}) => {
      const from = pathname;

      if (isSamePath(href, from)) {
        return true;
      }

      if (!force) {
        const guardResult = await checkGuards(href, from);

        if (guardResult.blocked) {
          blurActiveElement();
          openGuardConfirmation({ href, from, message: guardResult.message });
          return false;
        }
      }

      blurActiveElement();
      NAV_EVENT_HANDLERS.navigateStart(href, from);
      router.push(href);
      NAV_EVENT_HANDLERS.navigate(href, from);

      return true;
    },
    [openGuardConfirmation, pathname, router],
  );

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    NAV_EVENT_HANDLERS.navigateEnd(pathname, previousPathRef.current);
    previousPathRef.current = pathname;
  }, [pathname]);

  return {
    navigate,
    pathname,
    cancelNavigation,
  };
}
