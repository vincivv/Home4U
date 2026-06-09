import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveStyleContext,
  serializeStyleContext,
  styleSlug,
} from './styleContext.js';

test('styleSlug normalizes mixed formatting into a stable slug', () => {
  assert.equal(styleSlug(' Mid-Century Modern '), 'mid-century-modern');
});

test('resolveStyleContext returns built-in metadata for known styles', () => {
  const resolved = resolveStyleContext({ styleKey: 'scandinavian' });

  assert.equal(resolved.name, 'Scandinavian');
  assert.match(resolved.description, /hygge/i);
  assert.equal(resolved.themeMode, 'minimal');
  assert.equal(resolved.materialMode, 'soft');
  assert.equal(resolved.hasExplicitStyle, true);
});

test('serializeStyleContext preserves API-provided name and description', () => {
  const serialized = serializeStyleContext({
    id: 42,
    name: 'Japandi Retreat',
    description: 'Hybrid calm with Japanese restraint and Scandinavian warmth.',
  });

  assert.deepEqual(serialized, {
    id: 42,
    slug: 'japandi-retreat',
    name: 'Japandi Retreat',
    description: 'Hybrid calm with Japanese restraint and Scandinavian warmth.',
    signature: '',
    materials: [],
  });
});

test('resolveStyleContext preserves custom style copy while mapping to the closest built-in theme', () => {
  const resolved = resolveStyleContext({
    styleKey: 'japandi-retreat',
    style: serializeStyleContext({
      name: 'Japandi Retreat',
      description: 'Hybrid calm with Japanese restraint and Scandinavian warmth.',
    }),
  });

  assert.equal(resolved.name, 'Japandi Retreat');
  assert.equal(
    resolved.description,
    'Hybrid calm with Japanese restraint and Scandinavian warmth.',
  );
  assert.equal(resolved.key, 'japanese');
  assert.equal(resolved.themeMode, 'minimal');
  assert.equal(resolved.materialMode, 'walnut');
});
