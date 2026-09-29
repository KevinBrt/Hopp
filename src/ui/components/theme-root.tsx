import { useLayoutEffect, type ReactNode } from 'react';
import { useSettings } from '../hooks/use-settings';
import { useResolvedTheme } from '../hooks/use-theme';

/** Applies the theme to a whole extension page (<html> class + color-scheme). */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const theme = useResolvedTheme(useSettings().theme);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);
  return children;
}
