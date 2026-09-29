import { browser, type Browser } from 'wxt/browser';
import { emptySignals, type TabItem } from '@/core/items';
import { isListableUrl } from '@/core/url';
import { isEmptyTab, isPalettePage } from '../context';

async function loadGroupTitles(): Promise<Map<number, string>> {
  // tabGroups is Chrome only.
  if (!browser.tabGroups) return new Map();
  const groups = await browser.tabGroups.query({});
  return new Map(groups.filter((g) => g.title).map((g) => [g.id, g.title!]));
}

function toTabItem(tab: Browser.tabs.Tab, groups: Map<number, string>): TabItem | null {
  // Empty new tabs are never worth switching to.
  if (tab.id == null || !isListableUrl(tab.url) || isEmptyTab(tab.url) || isPalettePage(tab.url)) return null;
  return {
    kind: 'tab',
    id: `tab:${tab.id}`,
    title: tab.title || tab.url,
    url: tab.url,
    tabId: tab.id,
    windowId: tab.windowId,
    favIconUrl: tab.favIconUrl,
    active: tab.active,
    pinned: tab.pinned,
    audible: !!tab.audible,
    muted: !!tab.mutedInfo?.muted,
    lastAccessed: tab.lastAccessed ?? 0,
    groupTitle: tab.groupId != null && tab.groupId >= 0 ? groups.get(tab.groupId) : undefined,
    signals: emptySignals(),
  };
}

/** Tabs change constantly and querying them is cheap: never cached. */
export async function loadTabs(): Promise<TabItem[]> {
  const [tabs, groups] = await Promise.all([browser.tabs.query({}), loadGroupTitles().catch(() => new Map<number, string>())]);
  return tabs.map((tab) => toTabItem(tab, groups)).filter((tab) => tab !== null);
}
