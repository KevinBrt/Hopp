import { useEffect } from 'react';
import { ThemeRoot } from '../components/theme-root';
import { Palette } from './palette';

export type StandaloneMode = 'popup' | 'window';

const close = () => window.close();

/**
 * The palette as a whole page: the toolbar popup, or a small centered
 * window on pages where nothing can be injected.
 */
export function StandalonePalette({ mode }: { mode: StandaloneMode }) {
  useEffect(() => {
    if (mode !== 'window') return;
    window.addEventListener('blur', close);
    return () => window.removeEventListener('blur', close);
  }, [mode]);

  return (
    <ThemeRoot>
      <div className="h-full bg-surface font-sans text-[14px] antialiased">
        <Palette variant="standalone" onClose={close} />
      </div>
    </ThemeRoot>
  );
}
