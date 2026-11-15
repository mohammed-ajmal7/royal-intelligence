import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('tracked environment example contains no actual credentials', () => {
  const example = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  for (const key of ['CLASH_API_TOKEN', 'APP_ACCESS_KEY']) {
    const match = example.match(new RegExp('^[ \\t]*' + key + '[ \\t]*=[ \\t]*(.*)$', 'm'));
    assert.ok(match, `${key} must be documented in .env.example`);
    assert.equal(match[1].trim(), '', `${key} must be empty in tracked .env.example; use Vercel Secrets or an ignored .env.local instead`);
  }
});
