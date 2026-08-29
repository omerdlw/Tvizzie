'use client';

import { createContext, useContext } from 'react';

const AccountProfileShellContext = createContext(null);

export function AccountProfileShellProvider({ children, value = null }) {
  return (
    <AccountProfileShellContext.Provider value={value}>
      {children}
    </AccountProfileShellContext.Provider>
  );
}

export function useAccountProfileShell() {
  return useContext(AccountProfileShellContext);
}
