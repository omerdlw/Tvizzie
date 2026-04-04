import ReactDOM from 'react-dom';

import { DynamicNav } from '@/features/layout/dynamic-wrappers';
import { MOTION_CSS_VARIABLES } from '@/core/constants';
import { getSiteUrl } from '@/core/utils/site-url';
import { cn } from '@/core/utils';

import { geist, zuume } from '../fonts';
import './globals.css';
import { AppProviders } from './providers';

const SITE_URL = getSiteUrl();

export const metadata = {
  metadataBase: new URL(SITE_URL),
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
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
    shortcut: '/icon.svg',
  },
  openGraph: {
    description: 'Discover, track, and review your favorite movies',
    title: 'Tvizzie',
    siteName: 'Tvizzie',
    url: SITE_URL,
    type: 'website',
  },
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
          geist.className,
          zuume.variable
        )}
        style={MOTION_CSS_VARIABLES}
      >
        <ResourceHints />
        <AppProviders>
          <DynamicNav />
          <main className="h-auto w-full flex-1">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
