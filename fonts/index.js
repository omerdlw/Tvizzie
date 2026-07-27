import localFont from 'next/font/local';
import { GeistSans } from 'geist/font/sans';

export const geistSans = GeistSans;

export const zuume = localFont({
  variable: '--font-zuume',
  src: [{ path: './zuume/Zuume-Bold.woff2', weight: '700', style: 'normal' }],
});
