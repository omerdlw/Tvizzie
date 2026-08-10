'use client';

function getLocalStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function createAuthStorage(storageKey = 'app_auth_session') {
  const key = String(storageKey || '').trim() || 'app_auth_session';

  function clear() {
    try {
      getLocalStorage()?.removeItem(key);
    } catch {}
  }

  return {
    clear,

    read() {
      const storage = getLocalStorage();
      if (!storage) return null;

      try {
        const rawValue = storage.getItem(key);
        return rawValue ? JSON.parse(rawValue) : null;
      } catch {
        clear();
        return null;
      }
    },

    write(session) {
      const storage = getLocalStorage();
      if (!storage) return;

      if (!session) {
        clear();
        return;
      }

      try {
        storage.setItem(key, JSON.stringify(session));
      } catch {
        clear();
      }
    },
  };
}
