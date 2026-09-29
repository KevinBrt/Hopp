import { i18n } from '#i18n';
import { browser } from 'wxt/browser';
import { defineTabCommand } from './define';

export const tabCommands = [
  defineTabCommand({
    id: 'tab.close',
    icon: 'x',
    title: () => i18n.t('commands.closeTab'),
    keywords: ['close', 'fermer', 'remove'],
    run: async (tab) => void (await browser.tabs.remove(tab.id)),
  }),
  defineTabCommand({
    id: 'tab.duplicate',
    icon: 'copy',
    title: () => i18n.t('commands.duplicateTab'),
    keywords: ['duplicate', 'clone', 'dupliquer', 'copie'],
    run: async (tab) => void (await browser.tabs.duplicate(tab.id)),
  }),
  defineTabCommand({
    id: 'tab.pin',
    icon: (tab) => (tab.pinned ? 'pin-off' : 'pin'),
    title: (tab) => i18n.t(tab.pinned ? 'commands.unpinTab' : 'commands.pinTab'),
    keywords: ['pin', 'unpin', 'épingler', 'désépingler'],
    run: async (tab) => void (await browser.tabs.update(tab.id, { pinned: !tab.pinned })),
  }),
  defineTabCommand({
    id: 'tab.mute',
    icon: (tab) => (tab.mutedInfo?.muted ? 'volume' : 'volume-off'),
    title: (tab) => i18n.t(tab.mutedInfo?.muted ? 'commands.unmuteTab' : 'commands.muteTab'),
    keywords: ['mute', 'unmute', 'sound', 'audio', 'son', 'muet'],
    run: async (tab) => void (await browser.tabs.update(tab.id, { muted: !tab.mutedInfo?.muted })),
  }),
  defineTabCommand({
    id: 'tab.reload',
    icon: 'refresh',
    title: () => i18n.t('commands.reloadTab'),
    keywords: ['reload', 'refresh', 'recharger', 'actualiser'],
    run: async (tab) => void (await browser.tabs.reload(tab.id)),
  }),
  defineTabCommand({
    id: 'tab.hardReload',
    icon: 'refresh',
    title: () => i18n.t('commands.hardReloadTab'),
    keywords: ['hard reload', 'cache', 'bypass', 'forcer'],
    run: async (tab) => void (await browser.tabs.reload(tab.id, { bypassCache: true })),
  }),
  defineTabCommand({
    id: 'tab.copyUrl',
    icon: 'clipboard',
    title: () => i18n.t('commands.copyUrl'),
    keywords: ['copy', 'url', 'link', 'copier', 'lien', 'adresse'],
    when: (tab) => !!tab.url,
    run: async (tab) => ({ copy: tab.url }),
  }),
  defineTabCommand({
    id: 'tab.moveToNewWindow',
    icon: 'app-window',
    title: () => i18n.t('commands.moveToNewWindow'),
    keywords: ['move', 'detach', 'window', 'déplacer', 'détacher', 'fenêtre'],
    run: async (tab) => void (await browser.windows.create({ tabId: tab.id })),
  }),
  defineTabCommand({
    id: 'tab.closeOthers',
    icon: 'square-x',
    title: () => i18n.t('commands.closeOtherTabs'),
    keywords: ['close others', 'fermer autres'],
    run: async (tab) => {
      const tabs = await browser.tabs.query({ windowId: tab.windowId, pinned: false });
      await browser.tabs.remove(tabs.flatMap((t) => (t.id != null && t.id !== tab.id ? [t.id] : [])));
    },
  }),
  defineTabCommand({
    id: 'tab.closeToRight',
    icon: 'square-x',
    title: () => i18n.t('commands.closeTabsToRight'),
    keywords: ['close right', 'fermer droite'],
    run: async (tab) => {
      const tabs = await browser.tabs.query({ windowId: tab.windowId, pinned: false });
      await browser.tabs.remove(tabs.flatMap((t) => (t.id != null && t.index > tab.index ? [t.id] : [])));
    },
  }),
  defineTabCommand({
    id: 'tab.discardOthers',
    icon: 'eye-off',
    title: () => i18n.t('commands.discardOtherTabs'),
    keywords: ['discard', 'memory', 'sleep', 'suspend', 'mémoire', 'décharger', 'veille'],
    run: async (tab) => {
      const tabs = await browser.tabs.query({ active: false, discarded: false });
      const ids = tabs.flatMap((t) => (t.id != null && t.id !== tab.id ? [t.id] : []));
      await Promise.allSettled(ids.map((id) => browser.tabs.discard(id)));
    },
  }),
];
