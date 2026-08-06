'use client';
import { createRouteRegistry } from '@/modules/registry/route-registry';

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
    <main className="relative flex min-h-screen w-screen items-center justify-center overflow-x-hidden px-4 pt-6 pb-28">
      <div className="pointer-events-none absolute inset-0 flex justify-center px-4">
        <div className="relative h-full w-full max-w-xl">
          <div className="absolute top-0 bottom-0 left-0 w-px bg-black/10" />
          <div className="absolute top-0 right-0 bottom-0 w-px bg-black/10" />
        </div>
      </div>
      <section className="relative w-full max-w-xl">{children}</section>
    </main>
  );
}
