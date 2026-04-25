import ReactDOM from 'react-dom';

import { cn } from '@/core/utils';

import { inter, zuume } from '../fonts';
import './globals.css';
import { AppProviders } from './providers';

export const metadata = {
  metadataBase: 'https://tvizzie.vercel.app',
  alternates: {
    canonical: '/',
  },
  applicationName: 'Tvizzie',
  description: 'Discover, track, and review your favorite movies',
  title: {
    default: 'Tvizzie',
    template: '%s | Tvizzie',
  },
  twitter: {
    title: 'Tvizzie',
    description: 'Discover, track, and review your favorite movies',
    card: 'summary_large_image',
  },
  icons: {
    icon: [{ url: '/tvizzie.png', type: 'image/png', sizes: '1024x1024' }],
    apple: [{ url: '/tvizzie.png', type: 'image/png', sizes: '1024x1024' }],
    shortcut: '/tvizzie.png',
  },
  openGraph: {
    description: 'Discover, track, and review your favorite movies',
    title: 'Tvizzie',
    siteName: 'Tvizzie',
    url: 'https://tvizzie.vercel.app',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

function ResourceHints() {
  ReactDOM.preconnect('https://image.tmdb.org');
  ReactDOM.prefetchDNS('https://image.tmdb.org');

  return null;
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          'h-auto w-full bg-white fill-black font-normal text-black antialiased',
          inter.variable,
          inter.className,
          zuume.variable
        )}
      >
        <ResourceHints />
        <AppProviders>
          <main className="h-auto w-full flex-1">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
