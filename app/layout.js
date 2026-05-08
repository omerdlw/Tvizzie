import { cn } from '@/core/utils';

import { inter, zuume } from '../fonts';
import './globals.css';
import { ResourceHints } from './_shell/metadata';
import { AppProviders } from './providers';

export { metadata, viewport } from './_shell/metadata';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          'h-auto w-full bg-black fill-white font-normal text-white antialiased',
          inter.variable,
          inter.className,
          zuume.variable
        )}
      >
        <ResourceHints />
        <div aria-hidden="true" className="app-noise-overlay" />
        <AppProviders>
          <main className="min-h-dvh w-full flex-1">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
