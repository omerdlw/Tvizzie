'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useGlimm } from 'glimm/next';

const ROUTE_READY_TIMEOUT_MS = 7000;
const RouteTransitionContext = createContext(null);

function getPathname(href) {
  return new URL(href, window.location.href).pathname;
}

export function RouteTransitionCoordinator({ children }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const nextRequestIdRef = useRef(0);
  const pendingRequestRef = useRef(null);
  const [coverId, setCoverId] = useState(null);

  const resolveReady = useCallback((request) => {
    if (!request || request.isReady) return;

    request.isReady = true;
    window.clearTimeout(request.timeoutId);
    request.resolve();
  }, []);

  const begin = useCallback(
    (href) => {
      resolveReady(pendingRequestRef.current);

      const id = ++nextRequestIdRef.current;
      let resolve;
      const ready = new Promise((resolvePromise) => {
        resolve = resolvePromise;
      });
      const request = {
        id,
        isReady: false,
        pathname: getPathname(href),
        resolve,
        timeoutId: 0,
      };

      request.timeoutId = window.setTimeout(() => resolveReady(request), ROUTE_READY_TIMEOUT_MS);
      pendingRequestRef.current = request;
      setCoverId(id);

      return { id, ready };
    },
    [resolveReady],
  );

  const finish = useCallback(
    (id) => {
      const request = pendingRequestRef.current;

      if (!request || request.id !== id) return;

      resolveReady(request);
      pendingRequestRef.current = null;
      setCoverId(null);
    },
    [resolveReady],
  );

  useEffect(() => {
    const request = pendingRequestRef.current;

    if (request && pathname === request.pathname) {
      resolveReady(request);
    }
  }, [pathname, resolveReady]);

  useEffect(
    () => () => {
      resolveReady(pendingRequestRef.current);
    },
    [resolveReady],
  );

  const value = useRef({ begin, finish });
  value.current.begin = begin;
  value.current.finish = finish;

  return (
    <RouteTransitionContext.Provider value={value.current}>
      {children}
      <AnimatePresence initial={false}>
        {coverId !== null ? (
          <motion.div
            key="route-transition-cover"
            aria-hidden="true"
            className="pointer-events-auto fixed inset-0 z-[999] bg-black"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 0.68 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : null}
      </AnimatePresence>
    </RouteTransitionContext.Provider>
  );
}

function useRouteTransitionCoordinator() {
  const context = useContext(RouteTransitionContext);

  if (!context) {
    throw new Error('useRouteSweepNavigation must be used inside RouteTransitionCoordinator');
  }

  return context;
}

export function useRouteSweepNavigation() {
  const router = useRouter();
  const { sweep } = useGlimm();
  const { begin, finish } = useRouteTransitionCoordinator();

  return useCallback(
    (href) => {
      router.prefetch?.(href);
      const request = begin(href);
      const handle = sweep(() => {
        router.push(href);
        return request.ready;
      });

      handle.done.finally(() => finish(request.id));
      return handle;
    },
    [begin, finish, router, sweep],
  );
}
