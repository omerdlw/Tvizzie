import localFont from 'next/font/local'

import { GeistSans } from 'geist/font'

export const geist = GeistSans

export const zuume = localFont({
  variable: '--font-zuume',
  src: [
    { path: './zuume/Zuume-ExtraLight.woff2', weight: '200', style: 'normal' },
    {
      path: './zuume/Zuume-ExtraLightItalic.woff2',
      weight: '200',
      style: 'italic',
    },
    { path: './zuume/Zuume-Light.woff2', weight: '300', style: 'normal' },
    { path: './zuume/Zuume-LightItalic.woff2', weight: '300', style: 'italic' },
    { path: './zuume/Zuume-Regular.woff2', weight: '400', style: 'normal' },
    { path: './zuume/Zuume-Italic.woff2', weight: '400', style: 'italic' },
    { path: './zuume/Zuume-Medium.woff2', weight: '500', style: 'normal' },
    {
      path: './zuume/Zuume-MediumItalic.woff2',
      weight: '500',
      style: 'italic',
    },
    { path: './zuume/Zuume-SemiBold.woff2', weight: '600', style: 'normal' },
    {
      path: './zuume/Zuume-SemiBoldItalic.woff2',
      weight: '600',
      style: 'italic',
    },
    { path: './zuume/Zuume-Bold.woff2', weight: '700', style: 'normal' },
    { path: './zuume/Zuume-BoldItalic.woff2', weight: '700', style: 'italic' },
    { path: './zuume/Zuume-ExtraBold.woff2', weight: '800', style: 'normal' },
    {
      path: './zuume/Zuume-ExtraBoldItalic.woff2',
      weight: '800',
      style: 'italic',
    },
    { path: './zuume/Zuume-Black.woff2', weight: '900', style: 'normal' },
    { path: './zuume/Zuume-BlackItalic.woff2', weight: '900', style: 'italic' },
  ],
})
