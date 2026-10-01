/**
 * Site search: "yt lofi" searches YouTube directly. Each site has one or
 * more keywords and a URL template where `%s` stands for the query.
 *
 * - "<keyword> <text>": the site search becomes the first result, so Enter
 *   runs it right away.
 * - "<keyword>" alone: offered after the other results; Tab (or Enter on
 *   it) turns the keyword into a chip and the whole input searches the site.
 */
import type { Section } from './ranker';
import type { SiteSearchItem } from './items';

export interface SiteSearch {
  id: string;
  name: string;
  /** Lowercase, no spaces. */
  keywords: string[];
  /** http(s) URL containing `%s`. */
  url: string;
}

export const QUERY_PLACEHOLDER = '%s';

/** Replaces `%s` in a URL template with the encoded query. */
export function fillTemplate(template: string, query: string): string {
  return template.replaceAll(QUERY_PLACEHOLDER, encodeURIComponent(query));
}

export function isValidTemplate(url: string): boolean {
  if (!/^https?:\/\//i.test(url) || !url.includes(QUERY_PLACEHOLDER)) return false;
  try {
    new URL(fillTemplate(url, 'test'));
    return true;
  } catch {
    return false;
  }
}

/** "yt, YTB  video" → ["yt", "ytb", "video"]. */
export function parseKeywords(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[\s,]+/).filter(Boolean))];
}

export function siteHomepage(site: SiteSearch): string {
  return new URL(fillTemplate(site.url, '')).origin;
}

export function defaultSiteSearches(language: string): SiteSearch[] {
  const lang = language.split('-')[0]?.toLowerCase() || 'en';
  return [
    { id: 'youtube', name: 'YouTube', keywords: ['yt', 'ytb'], url: 'https://www.youtube.com/results?search_query=%s' },
    { id: 'google', name: 'Google', keywords: ['g'], url: 'https://www.google.com/search?q=%s' },
    { id: 'github', name: 'GitHub', keywords: ['gh'], url: 'https://github.com/search?q=%s' },
    { id: 'wikipedia', name: 'Wikipédia', keywords: ['wiki'], url: `https://${lang}.wikipedia.org/w/index.php?search=%s` },
    { id: 'maps', name: 'Google Maps', keywords: ['maps'], url: 'https://www.google.com/maps/search/%s' },
    {
      id: 'translate',
      name: 'Google Traduction',
      keywords: ['tr'],
      url: `https://translate.google.com/?sl=auto&tl=${lang}&text=%s`,
    },
  ];
}

export interface SiteSearchMatch {
  site: SiteSearch;
  query: string;
  /** The keyword was followed by a space: the user is typing a query for it. */
  explicit: boolean;
}

export function parseSiteSearch(input: string, sites: readonly SiteSearch[]): SiteSearchMatch | null {
  const text = input.trimStart();
  const match = /^(\S+)(\s+)?(.*)$/s.exec(text);
  if (!match) return null;
  const keyword = match[1]!.toLowerCase();
  const site = sites.find((candidate) => isValidTemplate(candidate.url) && candidate.keywords.includes(keyword));
  if (!site) return null;
  return { site, query: (match[3] ?? '').trim(), explicit: !!match[2] };
}

/**
 * - `query` set: search it on the site;
 * - `query` empty: open the site's home page;
 * - `query` null: waiting for a query (picking it turns the keyword into a chip).
 */
export function siteSearchItem(site: SiteSearch, query: string | null): SiteSearchItem {
  return {
    kind: 'site-search',
    id: `site-search:${site.id}`,
    title: site.name,
    siteId: site.id,
    siteName: site.name,
    query,
    url: query ? fillTemplate(site.url, query) : siteHomepage(site),
  };
}

/** Adds the site search entry to ranked sections (or replaces them in chip mode). */
export function withSiteSearch(
  sections: Section[],
  input: string,
  sites: readonly SiteSearch[],
  active: SiteSearch | null,
): Section[] {
  if (active) return [{ id: 'site', items: [{ item: siteSearchItem(active, input.trim()) }] }];

  const match = parseSiteSearch(input, sites);
  if (!match) return sections;
  const section: Section = { id: 'site', items: [{ item: siteSearchItem(match.site, match.query || null) }] };
  return match.explicit ? [section, ...sections] : [...sections, section];
}
