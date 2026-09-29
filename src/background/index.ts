import { browser } from 'wxt/browser';
import { exposeBackgroundApi, type BackgroundApi } from '@/shared/messaging';
import { getCorpus, searchAllHistory } from './corpus';
import { dismiss, execute } from './executor';
import { togglePalette } from './launcher';
import { clearUsage } from './usage-store';

const api: BackgroundApi = {
  getCorpus,
  searchHistory: ({ query }) => searchAllHistory(query),
  execute,
  dismiss: ({ item }) => dismiss(item),
  clearUsage,
};

/** Registers every listener. Must run synchronously at service worker start. */
export function setupBackground(): void {
  exposeBackgroundApi(api);

  browser.commands.onCommand.addListener((command, tab) => {
    if (command === 'open-palette') void togglePalette(tab);
  });

  (browser.action ?? browser.browserAction).onClicked.addListener((tab) => void togglePalette(tab));

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') void browser.runtime.openOptionsPage();
  });
}
