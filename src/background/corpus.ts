import { buildCorpusItems, buildPages, type Corpus, type RawPage } from '@/core/corpus';
import type { PageItem } from '@/core/items';
import { hostname } from '@/core/url';
import { BROWSER } from '@/shared/env';
import { SEARCH_ENGINES } from '@/shared/search-engines';
import { getSettings, type Settings } from '@/shared/settings';
import { listCommandItems } from './commands';
import { getActiveContext } from './context';
import { loadBookmarks } from './sources/bookmarks';
import { loadHistory, searchHistory } from './sources/history';
import { loadTabs } from './sources/tabs';
import { loadTopSites } from './sources/top-sites';
import { getUsage } from './usage-store';

/** A failing source must never break the palette. */
async function safe<T>(label: string, enabled: boolean, load: () => Promise<T[]>): Promise<T[]> {
  if (!enabled) return [];
  try {
    return await load();
  } catch (error) {
    console.warn(`[hop] could not load ${label}`, error);
    return [];
  }
}

function engineName(settings: Settings): string | null {
  if (settings.searchEngine === 'custom') return settings.customSearchUrl ? hostname(settings.customSearchUrl) : null;
  return SEARCH_ENGINES[settings.searchEngine].name;
}

async function buildCorpus(): Promise<Corpus> {
  const [settings, active, usage] = await Promise.all([getSettings(), getActiveContext(), getUsage()]);
  const { sources } = settings;

  const [tabs, topSites, bookmarks, history] = await Promise.all([
    safe('tabs', sources.tabs, loadTabs),
    safe<RawPage>('top sites', sources.topSites, loadTopSites),
    safe<RawPage>('bookmarks', sources.bookmarks, loadBookmarks),
    safe<RawPage>('history', sources.history, loadHistory),
  ]);
  const commands = sources.commands ? listCommandItems({ ...active, browser: BROWSER }) : [];

  return {
    items: buildCorpusItems({ tabs, pages: [...topSites, ...bookmarks, ...history], commands }),
    usage,
    context: {
      browser: BROWSER,
      currentTabId: active.tab?.id,
      faviconApi: BROWSER === 'chrome',
      searchEngineName: engineName(settings),
    },
  };
}

// The launcher starts building the corpus as soon as the shortcut is
// pressed; the palette's request a few ms later reuses the same promise.
const REUSE_WINDOW = 1_500;
let pending: { promise: Promise<Corpus>; at: number } | null = null;

export function getCorpus(): Promise<Corpus> {
  if (pending && Date.now() - pending.at < REUSE_WINDOW) return pending.promise;
  const promise = buildCorpus();
  pending = { promise, at: Date.now() };
  promise.catch(() => (pending = null));
  return promise;
}

export function warmCorpus(): void {
  getCorpus().catch(() => {});
}

export async function searchAllHistory(query: string): Promise<PageItem[]> {
  const settings = await getSettings();
  if (!settings.sources.history || !query.trim()) return [];
  return [...buildPages(await searchHistory(query)).values()];
}
