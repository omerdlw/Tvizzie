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
  description: 'A robust foundation for web projects',
  title: 'My Web Base',
  openGraph: {
    description: 'A robust foundation for web projects',
    title: 'My Web Base',
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
