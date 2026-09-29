/**
 * Builds the searchable corpus from raw browser data: pages coming from
 * history, bookmarks and top sites are merged by canonical URL, and a page
 * that is already open becomes its tab (switching beats opening a duplicate).
 */
import {
  emptySignals,
  type CommandItem,
  type CorpusItem,
  type PageItem,
  type PageSignals,
  type PaletteItem,
  type TabItem,
} from './items';
import type { UsageData } from './usage';
import { isListableUrl, normalizeUrl } from './url';

export type PageSource = 'history' | 'bookmark' | 'top-site';

export interface RawPage {
  source: PageSource;
  url: string;
  title: string;
  visitCount?: number;
  typedCount?: number;
  lastVisit?: number;
  topSiteRank?: number;
  folder?: string;
}

/** Information about where the palette was opened from. */
export interface PaletteContext {
  browser: 'chrome' | 'firefox';
  currentTabId?: number;
  /** Chrome's `_favicon` endpoint is available. */
  faviconApi: boolean;
  /** Display name of the configured web search engine, null for the browser's default. */
  searchEngineName: string | null;
}

export interface Corpus {
  items: CorpusItem[];
  usage: UsageData;
  context: PaletteContext;
}

export const pageId = (url: string) => `page:${normalizeUrl(url)}`;

/**
 * Key under which picks are learned. URL based for tabs and pages, so
 * learning survives closing and reopening a tab.
 */
export function usageKey(item: PaletteItem): string | null {
  switch (item.kind) {
    case 'tab':
    case 'page':
    case 'navigate':
      return `url:${normalizeUrl(item.url)}`;
    case 'command':
      return `cmd:${item.commandId}`;
    case 'search':
      return null;
  }
}

function mergeSignals(target: PageSignals, page: RawPage): void {
  target.visitCount = Math.max(target.visitCount, page.visitCount ?? 0);
  target.typedCount = Math.max(target.typedCount, page.typedCount ?? 0);
  target.lastVisit = Math.max(target.lastVisit, page.lastVisit ?? 0);
  if (page.source === 'bookmark') target.bookmarked = true;
  if (page.topSiteRank != null && page.topSiteRank >= 0) {
    target.topSiteRank =
      target.topSiteRank < 0 ? page.topSiteRank : Math.min(target.topSiteRank, page.topSiteRank);
  }
}

/** Merges raw pages sharing the same canonical URL into `PageItem`s. */
export function buildPages(raw: RawPage[]): Map<string, PageItem> {
  const pages = new Map<string, PageItem>();
  for (const entry of raw) {
    if (!isListableUrl(entry.url)) continue;
    const key = normalizeUrl(entry.url);
    let page = pages.get(key);
    if (!page) {
      page = {
        kind: 'page',
        id: `page:${key}`,
        url: entry.url,
        title: '',
        signals: emptySignals(),
        inHistory: false,
      };
      pages.set(key, page);
    }
    mergeSignals(page.signals, entry);
    if (entry.source === 'history') page.inHistory = true;
    if (entry.folder && !page.folder) page.folder = entry.folder;
    // Bookmark titles are chosen by the user, so they win.
    if (entry.title && (!page.title || entry.source === 'bookmark')) page.title = entry.title;
  }
  for (const page of pages.values()) page.title ||= page.url;
  return pages;
}

export function buildCorpusItems(input: {
  tabs: TabItem[];
  pages: RawPage[];
  commands: CommandItem[];
}): CorpusItem[] {
  const pages = buildPages(input.pages);

  const tabs = input.tabs.map((tab) => {
    const key = normalizeUrl(tab.url);
    const page = pages.get(key);
    if (!page) return tab;
    return { ...tab, signals: { ...page.signals } };
  });
  for (const tab of tabs) pages.delete(normalizeUrl(tab.url));

  return [...tabs, ...pages.values(), ...input.commands];
}

/** Adds pages found later (deep history search) without creating duplicates. */
export function withExtraPages(items: CorpusItem[], extra: PageItem[]): CorpusItem[] {
  if (extra.length === 0) return items;
  const known = new Set<string>();
  for (const item of items) {
    if (item.kind === 'page') known.add(item.id);
    else if (item.kind === 'tab') known.add(pageId(item.url));
  }
  const fresh = extra.filter((page) => !known.has(page.id));
  return fresh.length ? [...items, ...fresh] : items;
}
