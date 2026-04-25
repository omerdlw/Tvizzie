import localFont from 'next/font/local';
import { Inter } from 'next/font/google';

export const inter = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-inter',
});

export const zuume = localFont({
  variable: '--font-zuume',
  src: [{ path: './zuume/Zuume-Bold.woff2', weight: '700', style: 'normal' }],
});
