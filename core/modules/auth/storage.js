'use client';

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function createAuthStorage(storageKey = 'app_auth_session') {
  const key = String(storageKey || '').trim() || 'app_auth_session';

  return {
    clear() {
      const storage = getLocalStorage();

      if (!storage) {
        return;
      }

      storage.removeItem(key);
    },

    read() {
      const storage = getLocalStorage();

      if (!storage) {
        return null;
      }

      try {
        const rawValue = storage.getItem(key);
        return rawValue ? JSON.parse(rawValue) : null;
      } catch {
        storage.removeItem(key);
        return null;
      }
    },

    write(session) {
      const storage = getLocalStorage();

      if (!storage) {
        return;
      }

      if (!session) {
        storage.removeItem(key);
        return;
      }

      try {
        storage.setItem(key, JSON.stringify(session));
      } catch {
        storage.removeItem(key);
      }
    },
  };
}
