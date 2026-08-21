import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const LEGAL_ROUTE_FILES = [
  'app/(legal)/privacy/page.js',
  'domains/legal/ui/documents/privacy-document.js',
  'app/(legal)/terms/page.js',
  'domains/legal/ui/documents/terms-document.js',
];

test('static legal routes do not force dynamic rendering or route-level hydration', async () => {
  const sources = await Promise.all(LEGAL_ROUTE_FILES.map((file) => readFile(file, 'utf8')));

  for (const source of sources) {
    assert.doesNotMatch(source, /dynamic\s*=\s*['"]force-dynamic['"]/);
    assert.doesNotMatch(source, /^['"]use client['"];?/);
  }
});

test('legal quick links derive active state without client navigation state', async () => {
  const source = await readFile('domains/legal/ui/components/quick-links.js', 'utf8');

  assert.doesNotMatch(source, /usePathname/);
  assert.match(source, /activePath/);
});
