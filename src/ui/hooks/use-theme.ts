import { useSyncExternalStore } from 'react';
import type { ThemePreference } from '@/shared/settings';

const query = window.matchMedia('(prefers-color-scheme: dark)');

function subscribe(listener: () => void) {
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** Resolves "system" against the OS preference, live. */
export function useResolvedTheme(preference: ThemePreference): 'light' | 'dark' {
  const systemDark = useSyncExternalStore(subscribe, () => query.matches);
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}
