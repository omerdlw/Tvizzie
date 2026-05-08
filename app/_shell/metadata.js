import ReactDOM from 'react-dom';

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

export function ResourceHints() {
  ReactDOM.preconnect('https://image.tmdb.org');
  ReactDOM.prefetchDNS('https://image.tmdb.org');

  return null;
}
