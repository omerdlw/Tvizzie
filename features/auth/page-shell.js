'use client';

import { useRegistry } from '@/core/modules/registry';

export function AuthRouteRegistry({ authIsReady, description, icon, title }) {
  useRegistry({
    nav: {
      title,
      description,
      icon,
      action: null,
    },
    loading: { isLoading: !authIsReady },
  });

  return null;
}

export default function AuthPageShell({ children }) {
  return (
    <main className="flex min-h-screen w-screen items-center justify-center px-4 pt-6 pb-28">
      <section className="w-full max-w-xl">{children}</section>
    </main>
  );
}
