import { i18n } from '#i18n';
import { browser } from 'wxt/browser';
import { defineCommand, type CommandContext } from './define';

// Firefox forbids extensions from opening its about: pages.
const isChrome = (ctx: CommandContext) => ctx.browser === 'chrome';

/** Opens an internal page next to the current tab. */
const openInternalPage = (url: string) => async (ctx: CommandContext) => {
  await browser.tabs.create({ url, windowId: ctx.windowId, index: ctx.tab ? ctx.tab.index + 1 : undefined });
};

export const browserCommands = [
  defineCommand({
    id: 'browser.newTab',
    icon: 'plus',
    title: () => i18n.t('commands.newTab'),
    keywords: ['new tab', 'nouvel onglet', 'create'],
    run: async (ctx) => void (await browser.tabs.create({ windowId: ctx.windowId })),
  }),
  defineCommand({
    id: 'browser.newWindow',
    icon: 'app-window',
    title: () => i18n.t('commands.newWindow'),
    keywords: ['new window', 'nouvelle fenêtre'],
    run: async () => void (await browser.windows.create({})),
  }),
  defineCommand({
    id: 'browser.newPrivateWindow',
    icon: 'eye-off',
    title: () => i18n.t('commands.newPrivateWindow'),
    keywords: ['incognito', 'private', 'privée', 'navigation privée'],
    run: async () => void (await browser.windows.create({ incognito: true })),
  }),
  defineCommand({
    id: 'browser.reopenClosed',
    icon: 'rotate-ccw',
    title: () => i18n.t('commands.reopenClosedTab'),
    keywords: ['reopen', 'restore', 'undo close', 'rouvrir', 'restaurer'],
    run: async () => void (await browser.sessions.restore()),
  }),
  defineCommand({
    id: 'browser.history',
    icon: 'history',
    title: () => i18n.t('commands.openHistory'),
    keywords: ['history', 'historique'],
    when: isChrome,
    run: openInternalPage('chrome://history'),
  }),
  defineCommand({
    id: 'browser.downloads',
    icon: 'download',
    title: () => i18n.t('commands.openDownloads'),
    keywords: ['downloads', 'téléchargements'],
    when: isChrome,
    run: openInternalPage('chrome://downloads'),
  }),
  defineCommand({
    id: 'browser.bookmarks',
    icon: 'bookmark',
    title: () => i18n.t('commands.openBookmarks'),
    keywords: ['bookmarks', 'favoris', 'marque-pages'],
    when: isChrome,
    run: openInternalPage('chrome://bookmarks'),
  }),
  defineCommand({
    id: 'browser.extensions',
    icon: 'puzzle',
    title: () => i18n.t('commands.openExtensions'),
    keywords: ['extensions', 'addons', 'modules'],
    when: isChrome,
    run: openInternalPage('chrome://extensions'),
  }),
  defineCommand({
    id: 'browser.settings',
    icon: 'settings',
    title: () => i18n.t('commands.openBrowserSettings'),
    keywords: ['settings', 'preferences', 'paramètres', 'réglages'],
    when: isChrome,
    run: openInternalPage('chrome://settings'),
  }),
];
