import localFont from 'next/font/local';
import { GeistSans } from 'geist/font';
import { GeistMono } from 'geist/font/mono';
import {
  GeistPixelSquare,
  GeistPixelGrid,
  GeistPixelCircle,
  GeistPixelTriangle,
  GeistPixelLine,
} from 'geist/font/pixel';

export const geist = GeistSans;
export const geistMono = GeistMono;

export const zuume = localFont({
  variable: '--font-zuume',
  src: [{ path: './zuume/Zuume-Bold.woff2', weight: '700', style: 'normal' }],
});
