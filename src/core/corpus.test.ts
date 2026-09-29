import { describe, expect, it } from 'vitest';
import { buildCorpusItems, usageKey, withExtraPages } from './corpus';
import { emptySignals, type PageItem, type TabItem } from './items';

const tab = (id: number, url: string, title = url): TabItem => ({
  kind: 'tab',
  id: `tab:${id}`,
  title,
  url,
  tabId: id,
  windowId: 1,
  active: false,
  pinned: false,
  audible: false,
  muted: false,
  lastAccessed: 0,
  signals: emptySignals(),
});

describe('buildCorpusItems', () => {
  it('merges the same page coming from several sources', () => {
    const items = buildCorpusItems({
      tabs: [],
      commands: [],
      pages: [
        { source: 'history', url: 'https://www.figma.com/', title: 'Figma', visitCount: 12, lastVisit: 5 },
        { source: 'bookmark', url: 'https://figma.com', title: 'Design', folder: 'Work' },
        { source: 'top-site', url: 'http://figma.com/', title: 'Figma', topSiteRank: 2 },
      ],
    });
    expect(items).toHaveLength(1);
    const page = items[0] as PageItem;
    expect(page.title).toBe('Design');
    expect(page.signals).toMatchObject({ visitCount: 12, lastVisit: 5, bookmarked: true, topSiteRank: 2 });
    expect(page.inHistory).toBe(true);
  });

  it('turns an open page into its tab, keeping its popularity', () => {
    const items = buildCorpusItems({
      tabs: [tab(7, 'https://github.com/')],
      commands: [],
      pages: [{ source: 'history', url: 'https://github.com', title: 'GitHub', visitCount: 40 }],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'tab', signals: { visitCount: 40 } });
  });

  it('skips bookmarklets', () => {
    const items = buildCorpusItems({
      tabs: [],
      commands: [],
      pages: [{ source: 'bookmark', url: 'javascript:alert(1)', title: 'x' }],
    });
    expect(items).toHaveLength(0);
  });
});

describe('withExtraPages', () => {
  it('ignores pages already known or open', () => {
    const base = buildCorpusItems({ tabs: [tab(1, 'https://a.com')], commands: [], pages: [] });
    const extra = buildCorpusItems({
      tabs: [],
      commands: [],
      pages: [
        { source: 'history', url: 'https://a.com/', title: 'A' },
        { source: 'history', url: 'https://b.com/', title: 'B' },
      ],
    }) as PageItem[];
    expect(withExtraPages(base, extra).map((item) => item.title)).toEqual(['https://a.com', 'B']);
  });
});

describe('usageKey', () => {
  it('is shared by a tab and the page it came from', () => {
    const [page] = buildCorpusItems({
      tabs: [],
      commands: [],
      pages: [{ source: 'history', url: 'https://x.io/', title: 'X' }],
    });
    expect(usageKey(tab(3, 'http://www.x.io'))).toBe(usageKey(page!));
  });
});
