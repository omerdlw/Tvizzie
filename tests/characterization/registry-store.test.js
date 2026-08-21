import assert from 'node:assert/strict';
import test from 'node:test';

import { REGISTRY_TYPES } from '@/modules/registry/constants';
import {
  applyOperation,
  createInitialRegistries,
  createRegisterOperation,
  createUnregisterOperation,
  hasOperationEffect,
  resolveEntryValue,
} from '@/modules/registry/store';

function register(state, type, key, value, source, options, timestamp) {
  return applyOperation(
    state,
    createRegisterOperation(type, key, value, source, options, timestamp),
  );
}

test('priority registries resolve the highest-priority source', () => {
  let state = createInitialRegistries();
  state = register(state, REGISTRY_TYPES.MODAL, 'account', 'static-modal', 'static', {}, 10);
  state = register(state, REGISTRY_TYPES.MODAL, 'account', 'dynamic-modal', 'dynamic', {}, 20);
  state = register(state, REGISTRY_TYPES.MODAL, 'account', 'user-modal', 'user', {}, 30);

  assert.equal(resolveEntryValue(REGISTRY_TYPES.MODAL, state.MODAL.account), 'user-modal');
});

test('Nav records merge from lower to higher priority', () => {
  let state = createInitialRegistries();
  state = register(
    state,
    REGISTRY_TYPES.NAV,
    '/account',
    { icon: 'profile', title: 'Account' },
    'static',
    {},
    10,
  );
  state = register(
    state,
    REGISTRY_TYPES.NAV,
    '/account',
    { title: 'Omer', unreadCount: 2 },
    'dynamic',
    {},
    20,
  );

  assert.deepEqual(resolveEntryValue(REGISTRY_TYPES.NAV, state.NAV['/account']), {
    icon: 'profile',
    title: 'Omer',
    unreadCount: 2,
  });
});

test('instance-scoped unregister preserves sibling registrations', () => {
  let state = createInitialRegistries();
  state = register(
    state,
    REGISTRY_TYPES.NAV,
    '/movie/1',
    { title: 'First instance' },
    { instanceId: 'instance-1', source: 'dynamic' },
    undefined,
    10,
  );
  state = register(
    state,
    REGISTRY_TYPES.NAV,
    '/movie/1',
    { title: 'Second instance' },
    { instanceId: 'instance-2', source: 'dynamic' },
    undefined,
    20,
  );

  state = applyOperation(
    state,
    createUnregisterOperation(REGISTRY_TYPES.NAV, '/movie/1', {
      instanceId: 'instance-2',
      source: 'dynamic',
    }),
  );

  assert.deepEqual(resolveEntryValue(REGISTRY_TYPES.NAV, state.NAV['/movie/1']), {
    title: 'First instance',
  });
});

test('identical registrations do not publish redundant state', () => {
  let state = createInitialRegistries();
  const operation = createRegisterOperation(
    REGISTRY_TYPES.LOADING,
    'page-loading',
    { isLoading: true },
    'dynamic',
    {},
    100,
  );
  state = applyOperation(state, operation);

  assert.equal(hasOperationEffect(state, operation), false);
});
