/**
 * The palette's data model. Everything the palette can show is a
 * `PaletteItem`, a discriminated union on `kind`.
 *
 * - `CorpusItem`s are produced by the background (tabs, pages, commands).
 * - `NavigateItem` / `WebSearchItem` are synthesised from the typed query.
 */

/** Names of the icons a command can use. Mapped to components by the UI. */
export const ICON_NAMES = [
  'app-window',
  'bookmark',
  'clipboard',
  'copy',
  'download',
  'eye-off',
  'history',
  'keyboard',
  'pin',
  'pin-off',
  'plus',
  'puzzle',
  'refresh',
  'rotate-ccw',
  'settings',
  'square-x',
  'volume',
  'volume-off',
  'x',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** Popularity signals attached to anything that has a URL. */
export interface PageSignals {
  visitCount: number;
  /** Number of times the URL was typed in the address bar (Chrome only). */
  typedCount: number;
  /** Epoch ms, 0 when unknown. */
  lastVisit: number;
  bookmarked: boolean;
  /** Position in the browser's "top sites", -1 when absent. */
  topSiteRank: number;
}

interface ItemBase {
  /** Stable, unique id (also used as the cmdk value). */
  id: string;
  title: string;
}

export interface TabItem extends ItemBase {
  kind: 'tab';
  url: string;
  tabId: number;
  windowId: number;
  favIconUrl?: string;
  active: boolean;
  pinned: boolean;
  audible: boolean;
  muted: boolean;
  /** Epoch ms of the last time the tab was focused, 0 when unknown. */
  lastAccessed: number;
  groupTitle?: string;
  signals: PageSignals;
}

export interface PageItem extends ItemBase {
  kind: 'page';
  url: string;
  signals: PageSignals;
  inHistory: boolean;
  /** Bookmark folder path, e.g. "Work / Design". */
  folder?: string;
}

export interface CommandItem extends ItemBase {
  kind: 'command';
  commandId: string;
  icon: IconName;
  keywords: string[];
}

export interface NavigateItem extends ItemBase {
  kind: 'navigate';
  url: string;
}

export interface WebSearchItem extends ItemBase {
  kind: 'search';
  query: string;
}

export type CorpusItem = TabItem | PageItem | CommandItem;
export type PaletteItem = CorpusItem | NavigateItem | WebSearchItem;
export type UrlItem = TabItem | PageItem | NavigateItem;

export function emptySignals(): PageSignals {
  return { visitCount: 0, typedCount: 0, lastVisit: 0, bookmarked: false, topSiteRank: -1 };
}

export function hasUrl(item: PaletteItem): item is UrlItem {
  return item.kind === 'tab' || item.kind === 'page' || item.kind === 'navigate';
}
