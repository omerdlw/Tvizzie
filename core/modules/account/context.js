'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth, useAuthSessionReady } from '@/modules/auth';
import { createAccountClient } from './client';

const EMPTY_OBJECT = Object.freeze({});
const DEFAULT_ACCOUNT_BOOTSTRAP_CONFIG = Object.freeze({
  clearPayload: null,
  resolvePayload: null,
});
const DEFAULT_ACCOUNT_CONFIG = Object.freeze({
  adapter: null,
  autoBootstrap: true,
  autoSubscribeCurrentAccount: true,
  bootstrap: DEFAULT_ACCOUNT_BOOTSTRAP_CONFIG,
  debug: false,
});
const DEFAULT_ACCOUNT_STATE = Object.freeze({
  currentAccount: null,
  error: null,
  isBootstrapping: false,
  isLoading: true,
  isReady: false,
  lastUpdatedAt: null,
});

const CURRENT_ACCOUNT_SUBSCRIPTION_INTERVAL_MS = 15000;
const CURRENT_ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 60000;

const FALLBACK_ACCOUNT_ACTIONS = Object.freeze({
  clearError: () => {},
  ensureCurrentAccount: async () => null,
  refreshCurrentAccount: async () => null,
  syncCurrentAccountEmail: async () => null,
  updateCurrentAccount: async () => null,
});

function toAccountError(error, fallbackMessage) {
  if (error instanceof Error) return error;

  const normalizedError = new Error(error?.message || fallbackMessage || 'Account request failed');
  normalizedError.name = error?.name || 'AccountError';
  normalizedError.status = error?.status || 0;
  normalizedError.data = error?.data || null;
  return normalizedError;
}

function createResolvedConfig(config = EMPTY_OBJECT) {
  const providedBootstrap =
    config?.bootstrap && typeof config.bootstrap === 'object' ? config.bootstrap : EMPTY_OBJECT;

  return {
    ...DEFAULT_ACCOUNT_CONFIG,
    ...config,
    bootstrap: { ...DEFAULT_ACCOUNT_CONFIG.bootstrap, ...providedBootstrap },
  };
}

const AccountConfigContext = createContext(DEFAULT_ACCOUNT_CONFIG);
const AccountClientContext = createContext(null);
const AccountStateContext = createContext(DEFAULT_ACCOUNT_STATE);
const AccountActionsContext = createContext(FALLBACK_ACCOUNT_ACTIONS);

export function AccountProvider({ children, config = EMPTY_OBJECT }) {
  const auth = useAuth();
  const currentUserId = auth.isAuthenticated ? auth.user?.id || null : null;
  const isAuthSessionReady = useAuthSessionReady(currentUserId);

  const mergedConfig = useMemo(() => createResolvedConfig(config), [config]);
  const [state, setState] = useState(DEFAULT_ACCOUNT_STATE);

  const client = useMemo(
    () => (mergedConfig.adapter ? createAccountClient(mergedConfig) : null),
    [mergedConfig],
  );

  const adapterRef = useRef(mergedConfig.adapter);
  const bootstrappedUserRef = useRef(null);

  adapterRef.current = mergedConfig.adapter;

  const clearError = useCallback(() => {
    setState((prevState) => ({ ...prevState, error: null }));
  }, []);

  const setAccountState = useCallback((nextState) => {
    setState((prevState) => ({
      ...prevState,
      ...(typeof nextState === 'function' ? nextState(prevState) : nextState),
      lastUpdatedAt: Date.now(),
    }));
  }, []);

  const requireAuthenticatedUser = useCallback(() => {
    if (!auth.user?.id) {
      throw new Error('An authenticated user is required for account actions');
    }
    if (auth.isAuthenticated && !isAuthSessionReady) {
      throw new Error('Auth session is not ready yet');
    }
    return auth.user;
  }, [auth.isAuthenticated, auth.user, isAuthSessionReady]);

  const runAccountAction = useCallback(
    async (actionFn, fallbackErrorMessage, stateFlags = { isLoading: true }) => {
      setAccountState({ error: null, ...stateFlags });
      try {
        const nextAccount = await actionFn();
        setAccountState({
          currentAccount: nextAccount,
          error: null,
          isBootstrapping: false,
          isLoading: false,
          isReady: true,
        });
        return nextAccount;
      } catch (error) {
        const normalizedError = toAccountError(error, fallbackErrorMessage);
        setAccountState({
          error: normalizedError,
          isBootstrapping: false,
          isLoading: false,
          isReady: true,
        });
        throw normalizedError;
      }
    },
    [setAccountState],
  );

  const ensureCurrentAccount = useCallback(
    (options) => {
      const user = requireAuthenticatedUser();
      const adapter = adapterRef.current;

      if (typeof adapter?.ensureAccount !== 'function') {
        throw new Error('Account adapter method "ensureAccount" is not configured');
      }

      return runAccountAction(
        () => adapter.ensureAccount(user, options),
        'Account bootstrap failed',
        { isBootstrapping: true },
      );
    },
    [requireAuthenticatedUser, runAccountAction],
  );

  const refreshCurrentAccount = useCallback(() => {
    const user = requireAuthenticatedUser();
    const adapter = adapterRef.current;

    if (typeof adapter?.getAccount !== 'function') {
      throw new Error('Account adapter method "getAccount" is not configured');
    }

    return runAccountAction(() => adapter.getAccount(user.id), 'Account could not be loaded');
  }, [requireAuthenticatedUser, runAccountAction]);

  const updateCurrentAccount = useCallback(
    (updates = {}) => {
      const user = requireAuthenticatedUser();
      const adapter = adapterRef.current;

      if (typeof adapter?.updateAccount !== 'function') {
        throw new Error('Account adapter method "updateAccount" is not configured');
      }

      return runAccountAction(
        () => adapter.updateAccount({ updates, userId: user.id }),
        'Account could not be updated',
      );
    },
    [requireAuthenticatedUser, runAccountAction],
  );

  const syncCurrentAccountEmail = useCallback(
    (email) => {
      const user = requireAuthenticatedUser();
      const adapter = adapterRef.current;

      if (typeof adapter?.syncAccountEmail !== 'function') {
        throw new Error('Account adapter method "syncAccountEmail" is not configured');
      }

      const payload =
        typeof email === 'object' && email !== null
          ? { ...email, userId: user.id }
          : { email, userId: user.id };

      return runAccountAction(
        () => adapter.syncAccountEmail(payload),
        'Account email could not be synced',
      );
    },
    [requireAuthenticatedUser, runAccountAction],
  );

  useEffect(() => {
    if (!auth.isReady) return;

    if (auth.isAuthenticated && auth.user?.id && !isAuthSessionReady) {
      setAccountState({
        currentAccount: null,
        error: null,
        isBootstrapping: false,
        isLoading: true,
        isReady: false,
      });
      return;
    }

    if (!auth.isAuthenticated || !auth.user?.id) {
      bootstrappedUserRef.current = null;
      setState({
        ...DEFAULT_ACCOUNT_STATE,
        isLoading: false,
        isReady: true,
      });
      return;
    }

    const adapter = adapterRef.current;
    if (mergedConfig.autoBootstrap === false || typeof adapter?.ensureAccount !== 'function') {
      return;
    }

    if (bootstrappedUserRef.current === auth.user.id) {
      return;
    }

    let ignore = false;

    async function bootstrapCurrentAccount() {
      setAccountState({ error: null, isBootstrapping: true });

      try {
        const bootstrapPayload =
          typeof mergedConfig.bootstrap.resolvePayload === 'function'
            ? await mergedConfig.bootstrap.resolvePayload(auth.user)
            : null;

        const nextAccount = await adapter.ensureAccount(auth.user, bootstrapPayload || undefined);

        if (ignore) return;

        bootstrappedUserRef.current = auth.user.id;

        setAccountState((prevState) => ({
          currentAccount: nextAccount || prevState.currentAccount,
          error: null,
          isBootstrapping: false,
          isReady: true,
        }));

        if (bootstrapPayload && typeof mergedConfig.bootstrap.clearPayload === 'function') {
          await Promise.resolve(
            mergedConfig.bootstrap.clearPayload(auth.user, bootstrapPayload, nextAccount),
          ).catch(() => null);
        }
      } catch (error) {
        if (ignore) return;

        bootstrappedUserRef.current = null;
        setAccountState({
          error: toAccountError(error, 'Account bootstrap failed'),
          isBootstrapping: false,
          isLoading: false,
          isReady: true,
        });
      }
    }

    void bootstrapCurrentAccount();

    return () => {
      ignore = true;
    };
  }, [
    auth.isAuthenticated,
    auth.isReady,
    auth.user,
    isAuthSessionReady,
    mergedConfig.autoBootstrap,
    mergedConfig.bootstrap,
    setAccountState,
  ]);

  useEffect(() => {
    if (!auth.isReady) return;

    if (auth.isAuthenticated && auth.user?.id && !isAuthSessionReady) {
      setAccountState({ error: null, isLoading: true, isReady: false });
      return;
    }

    if (!auth.isAuthenticated || !auth.user?.id) return;

    const adapter = adapterRef.current;
    const shouldSubscribe = mergedConfig.autoSubscribeCurrentAccount !== false;
    let ignore = false;
    let unsubscribe = null;

    async function loadCurrentAccount() {
      setAccountState({ error: null, isLoading: true });

      try {
        if (shouldSubscribe && typeof adapter?.subscribeToAccount === 'function') {
          unsubscribe = adapter.subscribeToAccount(
            auth.user.id,
            (nextAccount) => {
              if (ignore) return;
              setAccountState({
                currentAccount: nextAccount,
                error: null,
                isLoading: false,
                isReady: true,
              });
            },
            {
              hiddenIntervalMs: CURRENT_ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
              intervalMs: CURRENT_ACCOUNT_SUBSCRIPTION_INTERVAL_MS,
              onError: (error) => {
                if (ignore) return;
                setAccountState({
                  error: toAccountError(error, 'Account subscription failed'),
                  isLoading: false,
                  isReady: true,
                });
              },
            },
          );
          return;
        }

        if (typeof adapter?.getAccount !== 'function') {
          if (!ignore) setAccountState({ isLoading: false, isReady: true });
          return;
        }

        const account = await adapter.getAccount(auth.user.id);
        if (ignore) return;

        setAccountState({
          currentAccount: account,
          error: null,
          isLoading: false,
          isReady: true,
        });
      } catch (error) {
        if (ignore) return;
        setAccountState({
          error: toAccountError(error, 'Account could not be loaded'),
          isLoading: false,
          isReady: true,
        });
      }
    }

    void loadCurrentAccount();

    return () => {
      ignore = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [
    auth.isAuthenticated,
    auth.isReady,
    auth.user?.id,
    isAuthSessionReady,
    mergedConfig.autoSubscribeCurrentAccount,
    setAccountState,
  ]);

  const actionsValue = useMemo(
    () => ({
      clearError,
      ensureCurrentAccount,
      refreshCurrentAccount,
      syncCurrentAccountEmail,
      updateCurrentAccount,
    }),
    [
      clearError,
      ensureCurrentAccount,
      refreshCurrentAccount,
      syncCurrentAccountEmail,
      updateCurrentAccount,
    ],
  );

  return (
    <AccountConfigContext.Provider value={mergedConfig}>
      <AccountClientContext.Provider value={client}>
        <AccountActionsContext.Provider value={actionsValue}>
          <AccountStateContext.Provider value={state}>{children}</AccountStateContext.Provider>
        </AccountActionsContext.Provider>
      </AccountClientContext.Provider>
    </AccountConfigContext.Provider>
  );
}

export function useAccountConfig() {
  return useContext(AccountConfigContext);
}

export function useAccountClient() {
  const client = useContext(AccountClientContext);
  const config = useAccountConfig();

  return useMemo(() => client || createAccountClient(config), [client, config]);
}

export function useAccountState() {
  return useContext(AccountStateContext);
}

export function useAccountActions() {
  return useContext(AccountActionsContext);
}

export function useCurrentAccount() {
  return useAccountState().currentAccount;
}

export function useAccount() {
  const config = useAccountConfig();
  const state = useAccountState();
  const actions = useAccountActions();

  return useMemo(
    () => ({
      ...state,
      ...actions,
      config,
    }),
    [actions, config, state],
  );
}
