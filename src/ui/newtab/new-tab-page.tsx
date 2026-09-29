import { i18n } from '#i18n';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { KeyCombo } from '../components/kbd';
import { ThemeRoot } from '../components/theme-root';
import { readPaletteShortcut } from '../lib/shortcut';
import type { OverlayController } from '../palette/overlay-controller';

// Marker replaced by the shortcut keys (browser.i18n mangles control chars).
const SLOT = '{{shortcut}}';
const IGNORED_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape', 'CapsLock']);

/** A calm background. Once the palette is dismissed, any key or click brings it back. */
export function NewTabPage({ controller }: { controller: OverlayController }) {
  const { phase } = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [shortcut, setShortcut] = useState('');

  useEffect(() => void readPaletteShortcut().then(setShortcut), []);

  useEffect(() => {
    if (phase !== 'closed') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (IGNORED_KEYS.has(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
      controller.open();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, controller]);

  // The shortcut is rendered as keys in the middle of the sentence.
  const [before, after] = i18n.t('newtab.hint', [SLOT]).split(SLOT);

  return (
    <ThemeRoot>
      <main
        onClick={controller.open}
        className="flex h-full cursor-default items-center justify-center bg-background font-sans text-[13px] text-muted-foreground antialiased select-none"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, var(--accent), transparent 60%)' }}
      >
        <p className={phase === 'closed' ? 'flex items-center gap-1.5 opacity-100 transition-opacity' : 'opacity-0'}>
          {before}
          {shortcut && <KeyCombo combo={shortcut} />}
          {after}
        </p>
      </main>
    </ThemeRoot>
  );
}
