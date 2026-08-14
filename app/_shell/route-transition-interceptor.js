'use client';

import { useEffect } from 'react';

import { shouldSweepRouteTransition } from '@/shared/route-transitions';
import { useRouteSweepNavigation } from '@/shared/route-transition-coordinator';

function shouldIntercept(event, anchor) {
  if (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0 ||
    anchor.dataset.glimmSkip !== undefined ||
    (anchor.target && anchor.target !== '_self') ||
    anchor.hasAttribute('download') ||
    !anchor.href
  ) {
    return false;
  }

  const destination = new URL(anchor.href, window.location.href);

  return (
    destination.origin === window.location.origin &&
    shouldSweepRouteTransition(window.location.pathname, destination.pathname)
  );
}

export function RouteTransitionInterceptor() {
  const navigateWithSweep = useRouteSweepNavigation();

  useEffect(() => {
    function handleClick(event) {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;

      if (!anchor || !shouldIntercept(event, anchor)) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const href = `${destination.pathname}${destination.search}${destination.hash}`;

      event.preventDefault();
      event.stopPropagation();
      navigateWithSweep(href);
    }

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [navigateWithSweep]);

  return null;
}
