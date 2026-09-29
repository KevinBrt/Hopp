import { i18n } from '#i18n';
import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { Button } from '../components/button';
import { KeyCombo } from '../components/kbd';
import { IS_MAC } from '../lib/platform';
import { PALETTE_COMMAND as COMMAND, readPaletteShortcut, shortcutFromEvent } from '../lib/shortcut';

// Firefox lets extensions change their shortcuts, Chrome only on its own page.
const commands = browser.commands as typeof browser.commands & {
  update?: (detail: { name: string; shortcut: string }) => Promise<void>;
  reset?: (name: string) => Promise<void>;
};
export const CAN_EDIT_SHORTCUT_INLINE = typeof commands.update === 'function';

export function ShortcutField() {
  const [shortcut, setShortcut] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => void readPaletteShortcut().then(setShortcut), []);

  useEffect(() => {
    refresh();
    // Chrome: the user may come back from chrome://extensions/shortcuts.
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = async (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') return setRecording(false);
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;
      const next = shortcutFromEvent(event, IS_MAC);
      if (!next) return setError(i18n.t('options.shortcut.invalid'));
      try {
        await commands.update!({ name: COMMAND, shortcut: next });
        setError(null);
        setRecording(false);
        refresh();
      } catch (reason) {
        setError(i18n.t('options.shortcut.error', [String(reason)]));
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recording, refresh]);

  const openBrowserShortcuts = () => void browser.tabs.create({ url: 'chrome://extensions/shortcuts' });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {recording ? (
          <span className="text-[13px] text-primary">{i18n.t('options.shortcut.recording')}</span>
        ) : shortcut ? (
          <KeyCombo combo={shortcut} />
        ) : (
          shortcut !== null && <span className="text-[13px] text-muted-foreground">{i18n.t('options.shortcut.notSet')}</span>
        )}
        {CAN_EDIT_SHORTCUT_INLINE ? (
          <>
            <Button
              onClick={() => {
                setError(null);
                setRecording((value) => !value);
              }}
            >
              {i18n.t('options.shortcut.record')}
            </Button>
            <Button variant="ghost" onClick={() => void commands.reset?.(COMMAND).then(refresh)}>
              {i18n.t('options.shortcut.reset')}
            </Button>
          </>
        ) : (
          <Button onClick={openBrowserShortcuts}>{i18n.t('options.shortcut.change')}</Button>
        )}
      </div>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
