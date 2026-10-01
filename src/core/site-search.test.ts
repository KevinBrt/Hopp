import { describe, expect, it } from 'vitest';
import type { Section } from './ranker';
import {
  defaultSiteSearches,
  fillTemplate,
  isValidTemplate,
  parseKeywords,
  parseSiteSearch,
  siteSearchItem,
  withSiteSearch,
} from './site-search';

const sites = defaultSiteSearches('fr-FR');
const youtube = sites.find((site) => site.id === 'youtube')!;
const ranked: Section[] = [{ id: 'results', items: [] }];

describe('parseSiteSearch', () => {
  it('recognises "keyword query", whatever the alias and case', () => {
    expect(parseSiteSearch('ytb lofi hip hop', sites)).toMatchObject({ site: youtube, query: 'lofi hip hop', explicit: true });
    expect(parseSiteSearch('YT Lofi', sites)).toMatchObject({ site: youtube, query: 'Lofi' });
  });

  it('recognises a keyword alone, waiting for a query', () => {
    expect(parseSiteSearch('yt', sites)).toMatchObject({ site: youtube, query: '', explicit: false });
    expect(parseSiteSearch('yt ', sites)).toMatchObject({ query: '', explicit: true });
  });

  it('ignores words that only start like a keyword', () => {
    expect(parseSiteSearch('ytbx lofi', sites)).toBeNull();
    expect(parseSiteSearch('youtube', sites)).toBeNull();
  });

  it('ignores sites with an invalid URL', () => {
    expect(parseSiteSearch('x test', [{ id: 'x', name: 'X', keywords: ['x'], url: 'javascript:alert(%s)' }])).toBeNull();
  });
});

describe('templates', () => {
  it('encodes the query', () => {
    expect(fillTemplate('https://a.io/?q=%s', 'café & co')).toBe('https://a.io/?q=caf%C3%A9%20%26%20co');
  });

  it('only accepts web URLs with %s', () => {
    expect(isValidTemplate('https://a.io/?q=%s')).toBe(true);
    expect(isValidTemplate('https://a.io/')).toBe(false);
    expect(isValidTemplate('javascript:%s')).toBe(false);
  });

  it('localizes the default sites', () => {
    expect(sites.find((site) => site.id === 'wikipedia')!.url).toContain('https://fr.wikipedia.org');
    expect(sites.flatMap((site) => site.keywords)).not.toContain('mdn');
  });

  it('parses keyword lists', () => {
    expect(parseKeywords(' YT, ytb  yt ')).toEqual(['yt', 'ytb']);
  });
});

describe('items', () => {
  it('builds the search URL, or the home page without query', () => {
    expect(siteSearchItem(youtube, 'lofi').url).toBe('https://www.youtube.com/results?search_query=lofi');
    expect(siteSearchItem(youtube, '').url).toBe('https://www.youtube.com');
  });
});

describe('withSiteSearch', () => {
  it('puts "keyword query" first, so Enter runs it', () => {
    const sections = withSiteSearch(ranked, 'ytb lofi', sites, null);
    expect(sections[0]).toMatchObject({ id: 'site', items: [{ item: { siteId: 'youtube', query: 'lofi' } }] });
  });

  it('offers a lone keyword after the results, without stealing Enter', () => {
    const sections = withSiteSearch(ranked, 'gh', sites, null);
    expect(sections.map((s) => s.id)).toEqual(['results', 'site']);
    expect(sections[1]!.items[0]!.item).toMatchObject({ siteId: 'github', query: null });
  });

  it('only shows the site in chip mode', () => {
    const sections = withSiteSearch(ranked, 'lofi', sites, youtube);
    expect(sections).toEqual([{ id: 'site', items: [{ item: siteSearchItem(youtube, 'lofi') }] }]);
  });

  it('leaves other queries untouched', () => {
    expect(withSiteSearch(ranked, 'github', sites, null)).toBe(ranked);
  });
});
