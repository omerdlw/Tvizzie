'use client'

import dynamic from 'next/dynamic'

export const DynamicControls = dynamic(() => import('@/modules/controls'), {
  ssr: false,
})

export { default as DynamicNav } from '@/modules/nav'
