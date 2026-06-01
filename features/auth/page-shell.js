'use client';

import { createRouteRegistry } from '@/features/app-shell/route-registry-factory';

export const AuthRouteRegistry = createRouteRegistry({
  displayName: 'AuthRouteRegistry',
  resolveConfig: ({ authIsReady, description, icon, title, action = null }) => ({
    nav: {
      title,
      description,
      icon,
      action,
    },
    loading: { isLoading: !authIsReady },
  }),
});

export default function AuthPageShell({ children }) {
  return (
    <main className="flex min-h-screen w-screen items-center justify-center px-4 pt-6 pb-28">
      <section className="w-full max-w-xl">{children}</section>
    </main>
  );
}
