import localFont from 'next/font/local'

import { GeistSans } from 'geist/font'

export const geist = GeistSans

export const zuume = localFont({
  variable: '--font-zuume',
  src: [
    { path: './zuume/Zuume-Bold.woff2', weight: '700', style: 'normal' },
  ],
})


import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display:'swap',
  fallback: ['Arial', 'sans-serif'],
});

export default montserrat;
