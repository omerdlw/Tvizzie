import assert from 'node:assert/strict';
import test from 'node:test';

import { createAccountAdapter, createAccountClient } from '@/modules/account';
import {
  buildOAuthCallbackUrl,
  normalizeOAuthProvider,
  resolveAuthCapabilities,
  sanitizeAuthNextPath,
} from '@/modules/auth';
import {
  DEFAULT_BACKGROUND,
  getEdgeFadeMask,
  mergeBackgroundState,
  resolveGradientSettings,
  resolveVideoClasses,
} from '@/modules/background/model';
import { resolveContextMenu, resolveMenuItems } from '@/modules/context-menu';
import {
  CONTROLS_EDGE_INSET,
  CONTROLS_NAV_GAP,
  CONTROLS_RAIL_GAP,
  getControlsLayout,
  hasControls,
  resolveControlsPairs,
} from '@/modules/controls';
import { getErrorReporter } from '@/modules/error-boundary';
import { normalizeLoadingOptions } from '@/modules/loading/runtime';
import { resolveModalHeader } from '@/modules/modal';
import { createModalState, finalizeModalClose } from '@/modules/modal/runtime';
import {
  applyStatusOverlay,
  areHudDefinitionsEqual,
  checkGuards,
  clearNavigationGuards,
  createGuardStatus,
  createHudDefinition,
  createNavigationTransaction,
  createNavigationTransactionState,
  createSurfaceEntryDefinition,
  createSurfaceFlowDefinition,
  createSurfaceFlowSession,
  createSurfaceReturnHandshake,
  getNavigationLocationKey,
  GuardAction,
  GuardActions,
  navigationTransactionReducer,
  normalizeSurfaceExtension,
  registerGuard,
  resolveActiveHud,
  updateSurfaceFlowSession,
  upsertHudEntry,
} from '@/modules/nav';
import {
  NAV_ACTION_MOTION_PROPS,
  NAV_ACTION_STYLES,
  NAVIGATION_TRANSACTION_EVENTS,
  NAVIGATION_TRANSACTION_STATUS,
  SEMANTIC_SURFACE_CLASSES,
  getNavActionClass,
  navActionClass,
} from '@/modules/nav/constants';
import {
  CRITICAL_TYPES,
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '@/modules/notification';
import { createRegistryStore, REGISTRY_TYPES, REGISTRY_VALIDATION_MODES } from '@/modules/registry';

const MODULE_ENTRIES = [
  'account',
  'auth',
  'background',
  'controls',
  'context-menu',
  'error-boundary',
  'loading',
  'modal',
  'nav',
  'notification',
  'registry',
];

test('module public APIs complete their core flows in dependency order', async (t) => {
  await t.test('01. every public module facade loads', async () => {
    const modules = await Promise.all(
      MODULE_ENTRIES.map(
        (moduleName) => import(new URL(`../modules/${moduleName}/index.js`, import.meta.url)),
      ),
    );

    for (const [index, module] of modules.entries()) {
      assert.ok(Object.keys(module).length > 0, MODULE_ENTRIES[index]);
    }
  });

  await t.test('02. account adapter and client delegate the account lifecycle', async () => {
    const calls = [];
    const adapter = createAccountAdapter({
      getAccount: async (userId) => {
        calls.push(['getAccount', userId]);
        return { id: userId };
      },
      primeAccount: (userId, profile) => {
        calls.push(['primeAccount', userId, profile]);
        return { ...profile, id: userId };
      },
    });
    const client = createAccountClient(adapter);

    assert.deepEqual(await client.getAccount('user-1'), { id: 'user-1' });
    assert.deepEqual(client.primeAccount('user-1', { username: 'omer' }), {
      id: 'user-1',
      username: 'omer',
    });
    assert.deepEqual(calls, [
      ['getAccount', 'user-1'],
      ['primeAccount', 'user-1', { username: 'omer' }],
    ]);
    assert.throws(() => client.updateAccount(), /is not configured/);
    assert.throws(
      () => createAccountAdapter({ getAccount: 'not-a-function' }),
      /must be a function/,
    );
  });

  await t.test('03. auth normalizes providers and produces safe callback targets', () => {
    assert.equal(normalizeOAuthProvider(' GOOGLE '), 'google');
    assert.equal(normalizeOAuthProvider('unknown'), null);
    assert.equal(sanitizeAuthNextPath('https://example.com'), '/account');
    assert.equal(
      sanitizeAuthNextPath('/account?tab=security#sessions'),
      '/account?tab=security#sessions',
    );

    assert.deepEqual(
      resolveAuthCapabilities({ providerIds: ['google.com', 'github', 'email', 'google.com'] }),
      {
        githubEnabled: true,
        googleEnabled: true,
        oauthEnabled: true,
        oauthProviderIds: ['google.com', 'github'],
        primaryProvider: 'email',
        xEnabled: false,
      },
    );
    assert.equal(
      buildOAuthCallbackUrl({
        origin: 'https://tvizzie.local',
        provider: 'google',
        nextPath: 'https://example.com',
      }),
      'https://tvizzie.local/auth/callback?intent=sign-in&next=%2Faccount&provider=google',
    );
  });

  await t.test('04. background visual state merges without losing nested configuration', () => {
    const state = mergeBackgroundState(DEFAULT_BACKGROUND, {
      image: '/hero.jpg',
      imageStyle: { opacity: 0.8 },
      videoOptions: { loop: true },
    });

    assert.equal(state.image, '/hero.jpg');
    assert.equal(state.imageStyle.opacity, 0.8);
    assert.equal(state.videoOptions.autoplay, true);
    assert.equal(state.videoOptions.loop, true);
    assert.deepEqual(resolveVideoClasses('bg-cover w-full', 'bg-center'), {
      customClasses: 'bg-cover w-full bg-center',
      mappedClasses: 'object-cover object-center',
    });
    assert.deepEqual(resolveGradientSettings({ fadeEdges: { left: 18, right: 24 } }), {
      enabled: true,
      leftOpacity: 0,
      leftPercent: 18,
      rightOpacity: 0,
      rightPercent: 24,
    });
    assert.match(getEdgeFadeMask({ leftPercent: 18, rightPercent: 24 }), /^linear-gradient/);
  });

  await t.test('05. context menus resolve the most specific usable definition', () => {
    const items = resolveMenuItems(
      {
        items: [
          { type: 'separator' },
          { label: 'Open' },
          { type: 'separator' },
          { type: 'separator' },
          { label: 'Archive' },
          { type: 'separator' },
        ],
      },
      {},
    );
    assert.deepEqual(
      items.map((item) => item.type),
      ['action', 'separator', 'action'],
    );

    const winner = resolveContextMenu(
      {
        '*': { items: [{ label: 'Global' }], priority: 1 },
        '/library': { items: [{ label: 'Library' }], priority: 2 },
      },
      '/library',
      null,
    );
    assert.equal(winner.items[0].label, 'Library');
  });

  await t.test('06. controls resolve symmetric rails around the Nav card geometry', () => {
    assert.equal(hasControls([]), false);
    assert.equal(hasControls([{ content: 'Subject', id: 'subject' }]), true);
    assert.deepEqual(
      resolveControlsPairs(
        {
          subject: {
            content: 'Subject',
            id: 'subject',
            order: 0,
            path: '/account/omer/activity',
            side: 'left',
          },
          sort: {
            content: 'Sort',
            id: 'sort',
            order: 0,
            path: '/account/omer/activity',
            side: 'right',
          },
          stale: {
            content: 'Stale',
            id: 'stale',
            path: '/account/omer/likes',
            side: 'left',
          },
        },
        '/account/omer/activity',
      ),
      {
        left: [{ content: 'Subject', id: 'subject' }],
        right: [{ content: 'Sort', id: 'sort' }],
      },
    );

    assert.deepEqual(
      getControlsLayout(
        { bottom: 896, height: 112, left: 320, right: 880 },
        { height: 900, width: 1200 },
      ),
      {
        bottom: CONTROLS_EDGE_INSET,
        height: 56,
        left: { maxWidth: 304, right: 888 },
        right: { left: 888, maxWidth: 304 },
      },
    );
    assert.equal(CONTROLS_NAV_GAP, 8);
    assert.equal(CONTROLS_RAIL_GAP, 4);
    assert.equal(getControlsLayout(null, { height: 900, width: 1200 }), null);
  });

  await t.test(
    '07. error reporting deduplicates a capture window and keeps handler output',
    async () => {
      const reporter = getErrorReporter({ deduplicateWindow: 1 });
      const reports = [];
      reporter.addHandler({ name: 'modules-test', handle: (report) => reports.push(report) });

      const error = new Error('module flow failure');
      assert.equal(reporter.captureError(error)?.error.message, 'module flow failure');
      assert.equal(reporter.captureError(error), undefined);
      await new Promise((resolve) => setTimeout(resolve, 5));
      reporter.captureError(error);

      assert.equal(reports.length, 2);
      reporter.removeHandler('modules-test');
    },
  );

  await t.test('08. loading options preserve the minimum-duration contract', () => {
    assert.deepEqual(
      normalizeLoadingOptions({ minDuration: 300, showOverlay: false, skeleton: 'account-card' }),
      { minDuration: 300, showOverlay: false, skeleton: 'account-card' },
    );
    assert.deepEqual(normalizeLoadingOptions({ minDuration: -1 }), {
      minDuration: 0,
      showOverlay: true,
      skeleton: null,
    });
  });

  await t.test('09. modal stack closure settles callbacks and the active surface', () => {
    const stack = [
      { id: 1, modalType: 'PREVIEW_MODAL', position: 'center', title: 'Preview' },
      { id: 2, modalType: 'NOTIFICATIONS_MODAL', position: 'right', showClose: false },
    ];
    const state = createModalState(stack);
    assert.equal(state.activeModalId, 2);
    assert.equal(state.position, 'right');
    assert.equal(state.showClose, false);
    assert.deepEqual(resolveModalHeader({ header: { showClose: false, title: 'Preview' } }), {
      actions: null,
      showClose: false,
      title: 'Preview',
    });

    const closed = [];
    const resolved = [];
    finalizeModalClose(
      'modal-1',
      { saved: true },
      {
        logCloseErrors: false,
        onCloseMapRef: { current: new Map([['modal-1', (result) => closed.push(result)]]) },
        resolveMapRef: { current: new Map([['modal-1', (result) => resolved.push(result)]]) },
      },
    );
    assert.deepEqual(closed, [{ saved: true }]);
    assert.deepEqual(resolved, [{ saved: true }]);
  });

  await t.test('10. nav carries transaction, HUD, and surface-flow state end to end', async () => {
    assert.equal(
      getNavigationLocationKey({ pathname: '/library', search: 'tab=watched', hash: 'top' }),
      '/library?tab=watched#top',
    );

    const transaction = createNavigationTransaction({ from: '/', id: 'nav-1', to: '/library' });
    let transactionState = navigationTransactionReducer(createNavigationTransactionState(), {
      transaction,
      type: NAVIGATION_TRANSACTION_EVENTS.START,
    });
    transactionState = navigationTransactionReducer(transactionState, {
      id: 'nav-1',
      type: NAVIGATION_TRANSACTION_EVENTS.COMPLETE,
    });
    assert.equal(transactionState.active, null);
    assert.equal(transactionState.last.status, NAVIGATION_TRANSACTION_STATUS.COMPLETED);

    const lowPriorityHud = createHudDefinition({ id: 'low', priority: 1, title: 'Loading' });
    const activeHud = createHudDefinition({
      id: 'high',
      priority: 3,
      progress: 125,
      title: 'Uploading',
    });
    assert.equal(activeHud.progress, 100);
    assert.equal(resolveActiveHud([lowPriorityHud, activeHud]).id, 'high');

    const hudA = createHudDefinition({
      id: 'hud-1',
      title: 'Syncing',
      actions: [{ key: 'act-1', label: 'Retry', onClick: () => {} }],
      props: { count: 3, actions: [{ key: 'act-1', label: 'Retry', onClick: () => {} }] },
      onCancel: () => {},
    });
    const hudB = createHudDefinition({
      id: 'hud-1',
      title: 'Syncing',
      actions: [{ key: 'act-1', label: 'Retry', onClick: () => {} }],
      props: { count: 3, actions: [{ key: 'act-1', label: 'Retry', onClick: () => {} }] },
      onCancel: () => {},
    });
    assert.equal(areHudDefinitionsEqual(hudA, hudB), true);
    const existingEntries = { 'hud-1': hudA };
    const nextEntries = upsertHudEntry(existingEntries, hudB);
    assert.equal(nextEntries, existingEntries);

    const definition = createSurfaceFlowDefinition({
      createSurface: () => null,
      id: 'account-security',
      initialSnapshot: { step: 'start' },
      returnTo: '/account',
    });
    const session = createSurfaceFlowSession(definition, { input: { source: 'settings' } });
    const updated = updateSurfaceFlowSession(session, { step: 'complete' });
    assert.equal(updated.status, 'open');
    assert.deepEqual(updated.snapshot, { step: 'complete' });
    assert.deepEqual(createSurfaceReturnHandshake('/account'), {
      focusKey: null,
      pathname: '/account',
      restoreScroll: true,
      returnOnCancel: false,
    });

    const ext = normalizeSurfaceExtension({ id: 'test-filter', align: 'right', content: 'Filter' });
    assert.equal(ext.id, 'test-filter');
    assert.equal(ext.align, 'right');
    assert.equal(ext.content, 'Filter');

    const surfaceDef = createSurfaceEntryDefinition({
      component: () => null,
      title: 'Providers',
      extensions: [{ id: 'filter-1', align: 'left', content: 'All' }],
    });
    assert.equal(surfaceDef.extensions.length, 1);
    assert.equal(surfaceDef.extensions[0].id, 'filter-1');
    assert.equal(surfaceDef.extensions[0].align, 'left');

    clearNavigationGuards();
    const unregisterGuard = registerGuard({
      when: (to) => to === '/blocked',
      message: 'Unsaved workbench changes',
    });
    const blockResult = await checkGuards('/blocked', '/current');
    assert.equal(blockResult.blocked, true);
    assert.equal(blockResult.message, 'Unsaved workbench changes');

    const passResult = await checkGuards('/allowed', '/current');
    assert.equal(passResult.blocked, false);
    unregisterGuard();

    const guardStatus = createGuardStatus({
      title: 'Navigasyon Engellendi',
      description: 'Test guard message',
    });
    assert.equal(guardStatus.type, 'GUARD');
    assert.equal(guardStatus.title, 'Navigasyon Engellendi');
    assert.equal(typeof guardStatus.action, 'function');
    assert.equal(typeof GuardAction, 'function');
    assert.equal(typeof GuardActions, 'function');
    assert.equal(GuardAction, GuardActions);

    const baseNavItem = { path: '/library', title: 'Library', icon: 'solar:bookmark-bold' };
    const overlayItem = applyStatusOverlay(baseNavItem, guardStatus);
    assert.equal(overlayItem.isStatus, true);
    assert.equal(overlayItem.title, 'Navigasyon Engellendi');
    assert.equal(overlayItem.description, 'Test guard message');
    assert.equal(typeof overlayItem.action, 'function');

    // Navigation constants, semantic surface tokens, and action styling unification
    assert.ok(SEMANTIC_SURFACE_CLASSES.error.surface);
    assert.ok(SEMANTIC_SURFACE_CLASSES.warning.surface);
    assert.ok(SEMANTIC_SURFACE_CLASSES.success.surface);
    assert.ok(SEMANTIC_SURFACE_CLASSES.info.surface);

    assert.equal(NAV_ACTION_STYLES.icon, 16);
    assert.ok(NAV_ACTION_STYLES.base);
    assert.ok(NAV_ACTION_STYLES.action.active);
    assert.ok(NAV_ACTION_STYLES.action.muted);
    assert.deepEqual(NAV_ACTION_MOTION_PROPS, { whileTap: { scale: 0.98 } });

    const defaultClass = getNavActionClass();
    assert.ok(defaultClass.includes(NAV_ACTION_STYLES.base));
    assert.ok(defaultClass.includes(NAV_ACTION_STYLES.muted));

    const activeClass = getNavActionClass({ isActive: true, className: 'custom-btn' });
    assert.ok(activeClass.includes(NAV_ACTION_STYLES.base));
    assert.ok(activeClass.includes(NAV_ACTION_STYLES.active));
    assert.ok(activeClass.includes('custom-btn'));

    const variantClass = getNavActionClass({ variant: 'test-variant-class' });
    assert.ok(variantClass.includes('test-variant-class'));
    assert.ok(variantClass.includes(NAV_ACTION_STYLES.base));

    const inputMuted = getNavActionClass({ button: 'test-input', isActive: false });
    assert.ok(inputMuted.includes('test-input'));
    assert.ok(inputMuted.includes(NAV_ACTION_STYLES.action.muted));
    assert.ok(!inputMuted.includes(NAV_ACTION_STYLES.base));

    const inputActive = getNavActionClass({ button: 'test-input', isActive: true });
    assert.ok(inputActive.includes('test-input'));
    assert.ok(inputActive.includes(NAV_ACTION_STYLES.action.active));

    const toneClass = getNavActionClass({ tone: 'error' });
    assert.ok(toneClass.includes('bg-error/10'));
    assert.ok(toneClass.includes('ring-error/50'));
  });

  await t.test('11. notifications persist critical state through the browser boundary', () => {
    const originalWindow = globalThis.window;
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const values = new Map();
    globalThis.window = {};
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        removeItem: (key) => values.delete(key),
        setItem: (key, value) => values.set(key, value),
      },
      writable: true,
    });

    try {
      assert.equal(setStorageItem('notification', { type: CRITICAL_TYPES.OFFLINE }), true);
      assert.deepEqual(getStorageItem('notification'), { type: CRITICAL_TYPES.OFFLINE });
      assert.equal(removeStorageItem('notification'), true);
      assert.equal(getStorageItem('notification'), null);
    } finally {
      if (originalWindow === undefined) delete globalThis.window;
      else globalThis.window = originalWindow;
      if (localStorageDescriptor)
        Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor);
      else delete globalThis.localStorage;
    }
  });

  await t.test('12. registry prioritizes valid entries and rejects strict invalid values', () => {
    const store = createRegistryStore();
    let notifications = 0;
    const unsubscribe = store.subscribe(REGISTRY_TYPES.NAV, '/library', () => {
      notifications += 1;
    });

    const rejected = store.register(REGISTRY_TYPES.NAV, '/library', 'invalid', {
      source: 'modules-test',
      validation: REGISTRY_VALIDATION_MODES.STRICT,
    });
    assert.equal(rejected.status, 'rejected');
    assert.equal(store.getSnapshot(REGISTRY_TYPES.NAV, '/library'), undefined);

    const first = store.register(
      REGISTRY_TYPES.NAV,
      '/library',
      { title: 'Library' },
      { instanceId: 'library-entry', source: 'modules-test' },
    );
    const replacement = store.register(
      REGISTRY_TYPES.NAV,
      '/library',
      { title: 'My Library' },
      { instanceId: 'library-entry', source: 'modules-test' },
    );

    assert.equal(store.getSnapshot(REGISTRY_TYPES.NAV, '/library').title, 'My Library');
    assert.equal(first.active, false);
    assert.equal(first.dispose(), true);
    assert.equal(store.getSnapshot(REGISTRY_TYPES.NAV, '/library').title, 'My Library');
    assert.equal(replacement.dispose(), true);
    assert.equal(store.getSnapshot(REGISTRY_TYPES.NAV, '/library'), undefined);
    assert.ok(notifications >= 2);
    unsubscribe();

    const controls = store.register(
      REGISTRY_TYPES.CONTROLS,
      '/library::sort',
      { content: 'Sort', id: 'sort', order: 0, path: '/library', side: 'right' },
      { source: 'modules-test' },
    );
    assert.equal(controls.status, 'active');
    assert.equal(store.getSnapshot(REGISTRY_TYPES.CONTROLS, '/library::sort').id, 'sort');
  });
});
