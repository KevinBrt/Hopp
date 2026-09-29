import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, getSettings, watchSettings, type Settings } from '@/shared/settings';

/**
 * One shared settings store per JS context. `preloadSettings()` lets entry
 * points await the first read so the UI never renders with defaults first
 * (e.g. a light flash for dark-theme users).
 */
let current: Settings = DEFAULT_SETTINGS;
let loaded: Promise<Settings> | null = null;
const listeners = new Set<() => void>();

function set(settings: Settings) {
  current = settings;
  for (const listener of listeners) listener();
}

export function preloadSettings(): Promise<Settings> {
  loaded ??= getSettings().then((settings) => {
    set(settings);
    watchSettings(set);
    return settings;
  });
  return loaded;
}

function subscribe(listener: () => void) {
  void preloadSettings();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => current);
}
