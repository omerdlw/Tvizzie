import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { CONTEXT_MENU_MICRO_SPRING } from '@/modules/context-menu/motion';
import { MODAL_MICRO_SPRING, MODAL_PANEL_SPRING } from '@/modules/modal/motion';
import { NAV_BUTTON_TRANSITION, NAV_CARD_SPRING } from '@/modules/nav/motion';
import { NOTIFICATION_MICRO_SPRING } from '@/modules/notification/motion';
import { MOTION_SPRINGS } from '@/shared/motion';

test('global modules consume the shared motion foundation', () => {
  assert.equal(NAV_BUTTON_TRANSITION, MOTION_SPRINGS.PRESS);
  assert.equal(MODAL_MICRO_SPRING, MOTION_SPRINGS.PRESS);
  assert.equal(NAV_CARD_SPRING, MOTION_SPRINGS.PANEL);
  assert.equal(MODAL_PANEL_SPRING, MOTION_SPRINGS.PANEL);
  assert.equal(CONTEXT_MENU_MICRO_SPRING, MOTION_SPRINGS.FEEDBACK);
  assert.equal(NOTIFICATION_MICRO_SPRING, MOTION_SPRINGS.FEEDBACK);
});

test('the application motion tree follows the user reduced-motion preference', async () => {
  const source = await readFile('app/providers.js', 'utf8');

  assert.match(source, /<MotionConfig reducedMotion="user">/);
});
