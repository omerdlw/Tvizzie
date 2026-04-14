'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/core/modules/auth';
import { useNavRegistry } from '@/core/modules/registry';

const ADMIN_NAV_KEY = '/admin';
const ADMIN_NAV_SOURCE = 'admin-nav-link';
const ADMIN_NAV_PRIORITY = 155;

export default function AdminNavRegistry() {
  const auth = useAuth();
  const { register, unregister } = useNavRegistry();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let ignore = false;
    const abortController = new AbortController();

    async function resolveAccess() {
      if (!auth.isReady || !auth.isAuthenticated) {
        setIsAllowed(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/access', {
          method: 'GET',
          cache: 'no-store',
          signal: abortController.signal,
        });

        if (!response.ok) {
          if (!ignore) {
            setIsAllowed(false);
          }
          return;
        }

        if (!ignore) {
          setIsAllowed(true);
        }
      } catch {
        if (!ignore) {
          setIsAllowed(false);
        }
      }
    }

    resolveAccess();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [auth.isAuthenticated, auth.isReady, auth.user?.id]);

  useEffect(() => {
    if (!isAllowed) {
      unregister(ADMIN_NAV_KEY, { source: ADMIN_NAV_SOURCE });
      return undefined;
    }

    register(
      ADMIN_NAV_KEY,
      {
        description: 'Supabase ops, security, and database insights',
        icon: 'solar:shield-keyhole-bold',
        name: 'admin',
        path: ADMIN_NAV_KEY,
        title: 'Admin',
      },
      {
        priority: ADMIN_NAV_PRIORITY,
        source: ADMIN_NAV_SOURCE,
      }
    );

    return () => {
      unregister(ADMIN_NAV_KEY, { source: ADMIN_NAV_SOURCE });
    };
  }, [isAllowed, register, unregister]);

  return null;
}
