'use client';

import { useCallback, useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useNavigationActions } from '../context';
import { createConfirmationSurfaceEntry } from '../../../../features/navigation/surfaces/confirmation-surface';

import { NAV_EVENT_HANDLERS } from '../events';
import { checkGuards } from '../guards';

function blurActiveElement() {
  if (typeof document === 'undefined') return;
  document.activeElement?.blur?.();
}

export function useNavigationCore() {
  const pathname = usePathname();
  const router = useRouter();
  const { closeSurface, openSurface } = useNavigationActions();
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

      openSurface(
        createConfirmationSurfaceEntry({
          title: 'Warning',
          description: message || 'You have unsaved changes. Are you sure you want to leave this page?',
          cancelText: 'Stay Here',
          confirmText: 'Leave Page',
          tone: 'danger',
          isDestructive: true,
          onConfirm: () => {
            blurActiveElement();
            router.push(href);
            NAV_EVENT_HANDLERS.navigate(href, from);
          },
        })
      );
    },
    [openSurface, router]
  );

  const navigate = useCallback(
    async (href, { force = false } = {}) => {
      const from = pathname;

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
    [openGuardConfirmation, pathname, router]
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
