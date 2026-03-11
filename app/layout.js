import {
  DynamicControls,
  DynamicNav,
} from '@/components/layout/dynamic-wrappers'
import { cn } from '@/lib/utils'
import { CountdownGate } from '@/modules/countdown/gate'

import { geist, zuume } from '../fonts'
import './globals.css'
import { AppProviders } from './providers'

export const metadata = {
  description:
    'Discover, track, and review your favorite movies and TV series.',
  title: 'Tvizzie',
  openGraph: {
    description:
      'Discover, track, and review your favorite movies and TV series.',
    title: 'Tvizzie',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        suppressHydrationWarning={true}
        className={cn(
          'h-auto w-full bg-black fill-white font-normal text-white antialiased',
          geist.className,
          zuume.variable
        )}
      >
        <AppProviders>
          <DynamicNav />
          <CountdownGate>
            <DynamicControls />
            <main className="h-auto w-full flex-1">{children}</main>
          </CountdownGate>
        </AppProviders>
      </body>
    </html>
  )
}
