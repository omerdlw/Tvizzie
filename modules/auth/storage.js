'use client'

import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '@/lib/utils/client-utils'

export function createAuthStorage(storageKey) {
  return {
    clear: () => removeStorageItem(storageKey),
    read: () => getStorageItem(storageKey, null),
    write: (session) => setStorageItem(storageKey, session),
  }
}
