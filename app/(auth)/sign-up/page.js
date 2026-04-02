import { Suspense } from 'react'

import Client from './client'

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <Client />
    </Suspense>
  )
}
