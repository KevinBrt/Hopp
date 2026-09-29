/** Web search engines. "browser" delegates to the browser's default engine. */
export const SEARCH_ENGINES = {
  browser: { name: null, url: null },
  google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=%s' },
  ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=%s' },
  kagi: { name: 'Kagi', url: 'https://kagi.com/search?q=%s' },
  qwant: { name: 'Qwant', url: 'https://www.qwant.com/?q=%s' },
  custom: { name: null, url: null },
} as const satisfies Record<string, { name: string | null; url: string | null }>;

export type SearchEngineId = keyof typeof SEARCH_ENGINES;

export const SEARCH_ENGINE_IDS = Object.keys(SEARCH_ENGINES) as SearchEngineId[];

/** Builds the search URL, or null when the browser's own engine must be used. */
export function buildSearchUrl(engine: SearchEngineId, customUrl: string, query: string): string | null {
  const template = engine === 'custom' ? customUrl : SEARCH_ENGINES[engine].url;
  if (!template || !template.includes('%s')) return null;
  return template.replace('%s', encodeURIComponent(query));
}
