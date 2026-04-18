'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const MotionRuntimeContext = createContext({
  initialPageAnimationsEnabled: false,
});

export function MotionRuntimeProvider({ children }) {
  const [initialPageAnimationsEnabled, setInitialPageAnimationsEnabled] = useState(false);

  useEffect(() => {
    setInitialPageAnimationsEnabled(true);
  }, []);

  const value = useMemo(
    () => ({
      initialPageAnimationsEnabled,
    }),
    [initialPageAnimationsEnabled]
  );

  return <MotionRuntimeContext.Provider value={value}>{children}</MotionRuntimeContext.Provider>;
}

export function useInitialPageAnimationsEnabled() {
  return useContext(MotionRuntimeContext).initialPageAnimationsEnabled;
}
