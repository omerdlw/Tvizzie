import test from 'node:test';
import assert from 'node:assert/strict';

import * as shared from '@/shared';
import * as sharedConstants from '@/shared/constants';
import * as sharedFormatting from '@/shared/formatting';
import * as sharedImage from '@/shared/image';
import * as sharedHttp from '@/shared/http';
import * as sharedEvents from '@/shared/events';
import * as sharedHooks from '@/shared/hooks';
import * as accountConstants from '@/domains/account/constants';
import * as mediaKey from '@/domains/media/utils/media-key';

test('shared and domain module decomposition and functionality', async (t) => {
  await t.test('01. submodules export their specific domains', () => {
    // Constants
    assert.equal(sharedConstants.Z_INDEX.NAV, 100);
    assert.equal(sharedConstants.PAGE_SHELL_MAX_WIDTH_CLASS, 'max-w-6xl');

    // Account constants (domains/account/constants.js)
    assert.equal(accountConstants.isReservedAccountSegment('activity'), true);
    assert.equal(accountConstants.isReservedAccountSegment('unknown-segment'), false);
    assert.ok(accountConstants.ACCOUNT_SECTION_KEYS.includes('activity'));
    assert.ok(accountConstants.RESERVED_ACCOUNT_SEGMENTS.has('edit'));

    // Media utilities (domains/media/utils/media-key.js)
    assert.equal(mediaKey.isMovieMediaType('movie'), true);
    assert.equal(mediaKey.isMovieMediaType('tv'), false);
    assert.equal(mediaKey.isTvMediaType('tv'), true);
    assert.equal(mediaKey.isPersonMediaType('person'), true);
    assert.equal(mediaKey.isTitleMediaType('movie'), true);
    assert.equal(mediaKey.isTitleMediaType('tv'), true);
    assert.equal(mediaKey.isTitleMediaType('person'), false);
    assert.equal(
      mediaKey.getMediaDetailPath({ entityId: '123', entityType: 'movie' }),
      '/movie/123',
    );
    assert.equal(mediaKey.getMediaDetailPath({ id: '456', media_type: 'tv' }), '/tv/456');
    assert.equal(mediaKey.getMediaDetailPath({ id: '789', media_type: 'person' }), null);
    assert.equal(mediaKey.buildMediaItemKey('movie', '123'), 'movie_123');

    // Formatting
    assert.equal(sharedFormatting.normalizeValue('  test  '), 'test');
    assert.equal(sharedFormatting.normalizeLowerValue('  TEST  '), 'test');
    assert.equal(sharedFormatting.formatRuntime(125), '2 hours 5 minutes');
    assert.equal(sharedFormatting.formatRuntime(60), '1 hours');
    assert.equal(sharedFormatting.formatRuntime(45), '45 minutes');
    assert.equal(sharedFormatting.formatRuntime(0), 'N/A');
    assert.equal(sharedFormatting.formatYear('2024-05-12'), '2024');
    assert.equal(sharedFormatting.formatCurrency(1000000), '$1,000,000');
    assert.equal(sharedFormatting.isValidUrl('https://example.com'), true);
    assert.equal(sharedFormatting.isValidUrl('invalid-url'), false);
    assert.deepEqual(sharedFormatting.chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);

    // Image
    assert.equal(sharedImage.resolveImageQuality('hero'), 88);
    assert.equal(sharedImage.resolveImageQuality('poster'), 78);
    assert.equal(sharedImage.resolveImageQuality('unknown', 90), 90);
    assert.equal(sharedImage.canUseNextImageOptimization('/local/image.jpg'), true);
    assert.equal(
      sharedImage.canUseNextImageOptimization('https://image.tmdb.org/t/p/w500/abc.jpg'),
      true,
    );
    assert.equal(
      sharedImage.canUseNextImageOptimization('https://unknown-domain.com/img.jpg'),
      false,
    );

    // Http
    assert.equal(typeof sharedHttp.requestJson, 'function');
    assert.equal(typeof sharedHttp.ApiRequestError, 'function');

    // Events
    assert.ok(sharedEvents.globalEvents instanceof sharedEvents.EventEmitter);
    assert.equal(typeof sharedEvents.EVENT_TYPES.AUTH_SIGN_IN, 'string');
    const emitter = new sharedEvents.EventEmitter();
    let received = null;
    const unsub = emitter.subscribe('test-event', (data) => {
      received = data;
    });
    emitter.emit('test-event', { ok: true });
    assert.deepEqual(received, { ok: true });
    unsub();
    emitter.emit('test-event', { ok: false });
    assert.deepEqual(received, { ok: true });

    // Hooks
    assert.equal(typeof sharedHooks.useClickOutside, 'function');
    assert.equal(typeof sharedHooks.useDebounce, 'function');
    assert.equal(typeof sharedHooks.useDraggableScroll, 'function');
  });

  await t.test('02. shared facade preserves full backward compatibility', () => {
    // Verify facade re-exports everything seamlessly
    assert.equal(shared.Z_INDEX, sharedConstants.Z_INDEX);
    assert.equal(shared.normalizeValue, sharedFormatting.normalizeValue);
    assert.equal(shared.canUseNextImageOptimization, sharedImage.canUseNextImageOptimization);
    assert.equal(shared.requestJson, sharedHttp.requestJson);
    assert.equal(shared.globalEvents, sharedEvents.globalEvents);
    assert.equal(shared.EVENT_TYPES, sharedEvents.EVENT_TYPES);
    assert.equal(shared.useClickOutside, sharedHooks.useClickOutside);
    assert.equal(shared.useDebounce, sharedHooks.useDebounce);
    assert.equal(shared.useDraggableScroll, sharedHooks.useDraggableScroll);
  });
});
