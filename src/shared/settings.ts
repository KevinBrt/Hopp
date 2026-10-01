import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { defaultSiteSearches, type SiteSearch } from '@/core/site-search';
import type { SearchEngineId } from './search-engines';

export type ThemePreference = 'system' | 'light' | 'dark';
export type OpenTarget = 'new-tab' | 'current-tab';
export type SourceId = 'tabs' | 'history' | 'bookmarks' | 'topSites' | 'commands';

export interface Settings {
  theme: ThemePreference;
  /** Blur the page behind the palette (costs some GPU on heavy pages). */
  blurBackdrop: boolean;
  /** Where pages and web searches open by default (Ctrl/⌘+Enter does the other). */
  openIn: OpenTarget;
  searchEngine: SearchEngineId;
  /** Used when `searchEngine` is "custom". `%s` is replaced by the query. */
  customSearchUrl: string;
  sources: Record<SourceId, boolean>;
  /** New tabs open the palette (opt-in). Otherwise Chrome shows its own new tab page. */
  newTabPalette: boolean;
  /** "yt lofi" searches YouTube. Editable in the options. */
  siteSearches: SiteSearch[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  blurBackdrop: true,
  newTabPalette: false,
  openIn: 'new-tab',
  searchEngine: 'browser',
  customSearchUrl: '',
  sources: { tabs: true, history: true, bookmarks: true, topSites: true, commands: true },
  siteSearches: defaultSiteSearches(browser.i18n.getUILanguage()),
};

const settingsItem = storage.defineItem<Partial<Settings>>('sync:settings', {
  fallback: {},
  version: 1,
});

/** Fills missing keys with defaults, so adding a setting never needs a migration. */
function withDefaults(stored: Partial<Settings> | null): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    sources: { ...DEFAULT_SETTINGS.sources, ...stored?.sources },
  };
}

export async function getSettings(): Promise<Settings> {
  return withDefaults(await settingsItem.getValue());
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await settingsItem.setValue(next);
  return next;
}

export function watchSettings(callback: (settings: Settings) => void): () => void {
  return settingsItem.watch((value) => callback(withDefaults(value)));
}
