import { Suspense } from 'react'

import Client from './client'

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <Client />
    </Suspense>
  )
}
