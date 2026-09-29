import { i18n } from '#i18n';
import { browser } from 'wxt/browser';
import { defineCommand } from './define';

export const hopCommands = [
  defineCommand({
    id: 'hop.settings',
    icon: 'settings',
    title: () => i18n.t('commands.openHopSettings'),
    keywords: ['hop', 'settings', 'options', 'paramètres', 'préférences'],
    run: async () => void (await browser.runtime.openOptionsPage()),
  }),
  defineCommand({
    id: 'hop.shortcut',
    icon: 'keyboard',
    title: () => i18n.t('commands.editShortcut'),
    keywords: ['hop', 'shortcut', 'hotkey', 'keyboard', 'raccourci', 'clavier'],
    // Chrome only lets users edit shortcuts on its own page; Firefox lets us do it in the options.
    run: async (ctx) => {
      if (ctx.browser === 'chrome') await browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
      else await browser.runtime.openOptionsPage();
    },
  }),
];
