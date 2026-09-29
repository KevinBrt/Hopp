import { browser } from 'wxt/browser';

/** Name of the manifest command opening the palette. */
export const PALETTE_COMMAND = 'open-palette';

/** The current shortcut ("Alt+K"…), empty when the user removed it. */
export async function readPaletteShortcut(): Promise<string> {
  const commands = await browser.commands.getAll();
  return commands.find((command) => command.name === PALETTE_COMMAND)?.shortcut ?? '';
}

/**
 * Converts a keydown into the WebExtension `commands` shortcut format
 * ("Ctrl+Shift+K", "Alt+Space"…), or null if browsers would reject it.
 * https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#shortcut_values
 */
const SPECIAL_KEYS: Record<string, string> = {
  Comma: 'Comma',
  Period: 'Period',
  Space: 'Space',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Insert: 'Insert',
  Delete: 'Delete',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
};

function keyName(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  return SPECIAL_KEYS[code] ?? null;
}

export function shortcutFromEvent(event: KeyboardEvent, isMac: boolean): string | null {
  const key = keyName(event.code);
  if (!key) return null;

  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push(isMac ? 'MacCtrl' : 'Ctrl');
  if (event.metaKey) {
    if (!isMac) return null;
    modifiers.push('Command');
  }
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');

  const hasPrimaryModifier = modifiers.some((modifier) => modifier !== 'Shift');
  if (!hasPrimaryModifier && !/^F\d+$/.test(key)) return null;
  return [...modifiers, key].join('+');
}
