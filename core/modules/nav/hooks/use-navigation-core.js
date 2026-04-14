'use client';

import { useCallback, useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/core/modules/auth';
import { useNavigationActions } from '../context';

import { NAV_EVENT_HANDLERS } from '../events';
import { checkGuards } from '../guards';
import { buildNavSignInHref, normalizeNavPathname } from '../utils';

function blurActiveElement() {
  if (typeof document === 'undefined') return;
  document.activeElement?.blur?.();
}

export function useNavigationCore() {
  const pathname = usePathname();
  const router = useRouter();
  const { clearGuardConfirmation, setGuardConfirmation, setPendingNavigationPath } = useNavigationActions();
  const { isAuthenticated, isReady } = useAuth();
  const previousPathRef = useRef(pathname);

  const cancelNavigation = useCallback(() => {
    clearGuardConfirmation();
  }, [clearGuardConfirmation]);

  const resolveNavigationHref = useCallback(
    (href) => {
      const normalizedHref = typeof href === 'string' ? href.trim() : '';

      if (!normalizedHref) {
        return '';
      }

      if (!isReady || isAuthenticated) {
        return normalizedHref;
      }

      if (normalizeNavPathname(normalizedHref) === '/account') {
        return buildNavSignInHref(normalizedHref);
      }

      return normalizedHref;
    },
    [isAuthenticated, isReady]
  );

  const openGuardConfirmation = useCallback(
    ({ href, from, message }) => {
      NAV_EVENT_HANDLERS.navigateStart(href, from);

      setGuardConfirmation({
        title: 'Warning',
        description: message || 'You have unsaved changes. Are you sure you want to leave this page?',
        cancelText: 'Stay Here',
        confirmText: 'Leave Page',
        tone: 'danger',
        isDestructive: true,
        onCancel: cancelNavigation,
        onConfirm: () => {
          blurActiveElement();
          clearGuardConfirmation();
          router.push(href);
          NAV_EVENT_HANDLERS.navigate(href, from);
        },
      });
    },
    [cancelNavigation, clearGuardConfirmation, router, setGuardConfirmation]
  );

  const navigate = useCallback(
    async (href, { force = false } = {}) => {
      const targetHref = resolveNavigationHref(href);

      if (!targetHref) {
        return false;
      }

      const from = pathname;
      const normalizedTargetPath = normalizeNavPathname(targetHref);

      if (!force) {
        const guardResult = await checkGuards(targetHref, from);

        if (guardResult.blocked) {
          blurActiveElement();
          openGuardConfirmation({ href: targetHref, from, message: guardResult.message });
          return false;
        }
      }

      clearGuardConfirmation();
      blurActiveElement();
      if (normalizedTargetPath && normalizedTargetPath !== normalizeNavPathname(pathname)) {
        setPendingNavigationPath(normalizedTargetPath);
      }
      NAV_EVENT_HANDLERS.navigateStart(targetHref, from);
      router.push(targetHref);
      NAV_EVENT_HANDLERS.navigate(targetHref, from);

      return true;
    },
    [clearGuardConfirmation, openGuardConfirmation, pathname, resolveNavigationHref, router, setPendingNavigationPath]
  );

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    clearGuardConfirmation();
    setPendingNavigationPath(null);
    NAV_EVENT_HANDLERS.navigateEnd(pathname, previousPathRef.current);
    previousPathRef.current = pathname;
  }, [clearGuardConfirmation, pathname, setPendingNavigationPath]);

  return {
    navigate,
    pathname,
    cancelNavigation,
  };
}
