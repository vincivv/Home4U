import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'virtualTour.preferences';

const DEFAULT_PREFERENCES = {
  themeMode: 'story',
  materialMode: 'walnut',
  narrativeEnabled: true,
  soundEnabled: true,
  ambientMotion: true,
};

const isDefaultPreferences = (preferences) => (
  preferences.themeMode === DEFAULT_PREFERENCES.themeMode
  && preferences.materialMode === DEFAULT_PREFERENCES.materialMode
  && preferences.narrativeEnabled === DEFAULT_PREFERENCES.narrativeEnabled
  && preferences.soundEnabled === DEFAULT_PREFERENCES.soundEnabled
  && preferences.ambientMotion === DEFAULT_PREFERENCES.ambientMotion
);

const normalizePreferences = (parsed = {}) => ({
  themeMode: typeof parsed.themeMode === 'string' ? parsed.themeMode : DEFAULT_PREFERENCES.themeMode,
  materialMode: typeof parsed.materialMode === 'string' ? parsed.materialMode : DEFAULT_PREFERENCES.materialMode,
  narrativeEnabled: typeof parsed.narrativeEnabled === 'boolean' ? parsed.narrativeEnabled : DEFAULT_PREFERENCES.narrativeEnabled,
  soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_PREFERENCES.soundEnabled,
  ambientMotion: typeof parsed.ambientMotion === 'boolean' ? parsed.ambientMotion : DEFAULT_PREFERENCES.ambientMotion,
});

const parseStoredPreferences = (raw) => {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const readStoredPreferences = () => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  let raw = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    void error;
  }
  return parseStoredPreferences(raw);
};

const useTourPreferences = () => {
  const [initial] = useState(readStoredPreferences);
  const [themeMode, setThemeMode] = useState(initial.themeMode);
  const [materialMode, setMaterialMode] = useState(initial.materialMode);
  const [narrativeEnabled, setNarrativeEnabled] = useState(initial.narrativeEnabled);
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled);
  const [ambientMotion, setAmbientMotion] = useState(initial.ambientMotion);

  const resetPreferences = useCallback(() => {
    setThemeMode(DEFAULT_PREFERENCES.themeMode);
    setMaterialMode(DEFAULT_PREFERENCES.materialMode);
    setNarrativeEnabled(DEFAULT_PREFERENCES.narrativeEnabled);
    setSoundEnabled(DEFAULT_PREFERENCES.soundEnabled);
    setAmbientMotion(DEFAULT_PREFERENCES.ambientMotion);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextPreferences = {
      themeMode,
      materialMode,
      narrativeEnabled,
      soundEnabled,
      ambientMotion,
    };
    try {
      if (isDefaultPreferences(nextPreferences)) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
      }
    } catch (error) {
      void error;
    }
  }, [themeMode, materialMode, narrativeEnabled, soundEnabled, ambientMotion]);

  return {
    themeMode,
    setThemeMode,
    materialMode,
    setMaterialMode,
    narrativeEnabled,
    setNarrativeEnabled,
    soundEnabled,
    setSoundEnabled,
    ambientMotion,
    setAmbientMotion,
    resetPreferences,
  };
};

export default useTourPreferences;
export {
  STORAGE_KEY,
  DEFAULT_PREFERENCES,
  isDefaultPreferences,
  normalizePreferences,
  parseStoredPreferences,
  readStoredPreferences,
};
