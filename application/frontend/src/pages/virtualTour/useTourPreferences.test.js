import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PREFERENCES,
  isDefaultPreferences,
  normalizePreferences,
  parseStoredPreferences,
} from './useTourPreferences.js';

test('normalizePreferences falls back to defaults for missing/invalid fields', () => {
  const normalized = normalizePreferences({
    themeMode: 'editorial',
    materialMode: 42,
    narrativeEnabled: false,
    soundEnabled: 'yes',
  });

  assert.equal(normalized.themeMode, 'editorial');
  assert.equal(normalized.materialMode, DEFAULT_PREFERENCES.materialMode);
  assert.equal(normalized.narrativeEnabled, false);
  assert.equal(normalized.soundEnabled, DEFAULT_PREFERENCES.soundEnabled);
  assert.equal(normalized.ambientMotion, DEFAULT_PREFERENCES.ambientMotion);
});

test('parseStoredPreferences handles invalid JSON safely', () => {
  const parsed = parseStoredPreferences('not-json');
  assert.deepEqual(parsed, DEFAULT_PREFERENCES);
});

test('isDefaultPreferences identifies default and customized states', () => {
  assert.equal(isDefaultPreferences(DEFAULT_PREFERENCES), true);
  assert.equal(
    isDefaultPreferences({ ...DEFAULT_PREFERENCES, ambientMotion: false }),
    false,
  );
});
