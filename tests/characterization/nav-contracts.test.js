import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';

import { checkGuards, registerGuard } from '@/modules/nav/guards';
import {
  createInlineSurfaceEntry,
  createSurfaceEntryDefinition,
  NAV_SURFACE_RENDER_MODE,
  resolveSurfaceAction,
} from '@/modules/nav/surface-model';
import { createPendingSurfaceScheduler } from '@/modules/nav/hooks/use-surface-stack';

test('component surface descriptors preserve presentation and lifecycle metadata', () => {
  function ConfirmationSurface() {
    return null;
  }

  const onClose = () => {};
  const definition = createSurfaceEntryDefinition({
    component: ConfirmationSurface,
    dismissible: false,
    header: {
      description: 'This action cannot be undone',
      icon: 'warning',
      title: 'Delete account',
    },
    onClose,
    props: { accountId: 'account-1' },
    width: 420,
  });

  assert.deepEqual(definition, {
    action: null,
    closeLabel: null,
    component: ConfirmationSurface,
    content: null,
    description: 'This action cannot be undone',
    dismissible: false,
    expandHorizontal: false,
    icon: 'warning',
    onClose,
    props: { accountId: 'account-1' },
    renderMode: NAV_SURFACE_RENDER_MODE.COMPONENT,
    showAction: false,
    title: 'Delete account',
    trailing: null,
    width: 420,
  });
});

test('React nodes become node-mode surfaces and invalid inputs are rejected', () => {
  const content = createElement('p', null, 'Surface content');
  const definition = createSurfaceEntryDefinition(content, { title: 'Details' });

  assert.equal(definition.renderMode, NAV_SURFACE_RENDER_MODE.NODE);
  assert.equal(definition.content, content);
  assert.equal(definition.title, 'Details');
  assert.equal(createSurfaceEntryDefinition(null), null);
  assert.equal(createSurfaceEntryDefinition({ title: 'Missing content' }), null);
});

test('inline surfaces and surface actions follow the existing precedence contract', () => {
  const itemAction = { label: 'Default action' };
  const surfaceAction = { label: 'Surface action' };
  const inlineSurface = createInlineSurfaceEntry({
    action: surfaceAction,
    content: 'Inline content',
    showAction: true,
  });

  assert.equal(inlineSurface.renderMode, NAV_SURFACE_RENDER_MODE.NODE);
  assert.equal(resolveSurfaceAction({ action: itemAction }, inlineSurface), surfaceAction);
  assert.equal(resolveSurfaceAction({ action: itemAction }, { showAction: true }), itemAction);
  assert.equal(resolveSurfaceAction({ action: itemAction }, { showAction: false }), null);
});

test('navigation guards block in registration order and expose block metadata', async () => {
  const blockEvents = [];
  const unregisterFirst = registerGuard({ when: false });
  const unregisterSecond = registerGuard({
    message: 'Unsaved changes',
    onBlock: (event) => blockEvents.push(event),
    when: async () => true,
  });

  try {
    const result = await checkGuards('/next', '/current');

    assert.equal(result.blocked, true);
    assert.equal(result.message, 'Unsaved changes');
    assert.equal(blockEvents.length, 1);
    assert.deepEqual(blockEvents[0], {
      from: '/current',
      guardId: result.guardId,
      message: 'Unsaved changes',
      to: '/next',
    });
  } finally {
    unregisterFirst();
    unregisterSecond();
  }

  assert.deepEqual(await checkGuards('/next', '/current'), { blocked: false });
});

test('pending surface timers can be cancelled before they open', () => {
  const callbacks = new Map();
  const clearedTimerIds = [];
  let nextTimerId = 0;
  const scheduler = createPendingSurfaceScheduler({
    clearTimer: (timerId) => {
      clearedTimerIds.push(timerId);
      callbacks.delete(timerId);
    },
    scheduleTimer: (callback) => {
      const timerId = ++nextTimerId;
      callbacks.set(timerId, callback);
      return timerId;
    },
  });
  let openCount = 0;

  scheduler.schedule(
    1,
    () => {
      openCount += 1;
    },
    380,
  );

  assert.equal(scheduler.size, 1);
  assert.equal(scheduler.getLatestId(), 1);
  assert.equal(scheduler.cancel(1), true);
  assert.equal(scheduler.size, 0);
  assert.deepEqual(clearedTimerIds, [1]);
  assert.equal(callbacks.size, 0);
  assert.equal(openCount, 0);
});

test('pending surface timers leave the queue before opening', () => {
  const callbacks = new Map();
  let nextTimerId = 0;
  const scheduler = createPendingSurfaceScheduler({
    clearTimer: (timerId) => callbacks.delete(timerId),
    scheduleTimer: (callback) => {
      const timerId = ++nextTimerId;
      callbacks.set(timerId, callback);
      return timerId;
    },
  });
  let observedQueueSize = null;

  scheduler.schedule(
    7,
    () => {
      observedQueueSize = scheduler.size;
    },
    380,
  );
  callbacks.get(1)();

  assert.equal(observedQueueSize, 0);
  assert.equal(scheduler.getLatestId(), null);
});

test('all pending surface timers are cancelled as a single lifecycle operation', () => {
  const activeTimerIds = new Set();
  let nextTimerId = 0;
  const scheduler = createPendingSurfaceScheduler({
    clearTimer: (timerId) => activeTimerIds.delete(timerId),
    scheduleTimer: () => {
      const timerId = ++nextTimerId;
      activeTimerIds.add(timerId);
      return timerId;
    },
  });

  scheduler.schedule(4, () => {}, 380);
  scheduler.schedule(5, () => {}, 380);

  assert.deepEqual(scheduler.cancelAll(), [4, 5]);
  assert.equal(scheduler.size, 0);
  assert.equal(activeTimerIds.size, 0);
});
