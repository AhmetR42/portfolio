import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS } from '../assets/js/i18n.js';

test('English and Dutch have the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.nl).sort(), Object.keys(STRINGS.en).sort());
});

test('every data-i18n key in the page has a translation', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g)) {
    assert.ok(key in STRINGS.en && key in STRINGS.nl, key);
  }
});
