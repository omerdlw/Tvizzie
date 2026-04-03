'use client'

import { useNavigationState } from '../context'

export const useNavHeight = () => {
  const { navHeight } = useNavigationState()
  return { navHeight, padding: { paddingBottom: `${navHeight}px` } }
}
