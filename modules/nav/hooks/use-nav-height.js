'use client';

import { useNavigationState } from '../nav-context';

export const useNavHeight = () => {
  const { navHeight } = useNavigationState();
  return { navHeight, padding: { paddingBottom: `${navHeight}px` } };
};
