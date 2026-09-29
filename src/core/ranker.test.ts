import { describe, expect, it } from 'vitest';
import { buildCorpusItems, type RawPage } from './corpus';
import { emptySignals, type CommandItem, type TabItem } from './items';
import { createRanker, type Section } from './ranker';
import { emptyUsage, recordPick } from './usage';

const NOW = new Date('2026-09-29T09:00:00').getTime();
const DAY = 86_400_000;

const tab = (id: number, url: string, title: string, lastAccessed = 0): TabItem => ({
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
  lastAccessed,
  signals: emptySignals(),
});

const command = (commandId: string, title: string, keywords: string[] = []): CommandItem => ({
  kind: 'command',
  id: `cmd:${commandId}`,
  commandId,
  title,
  icon: 'x',
  keywords,
});

const pages: RawPage[] = [
  { source: 'history', url: 'https://github.com/', title: 'GitHub', visitCount: 80, lastVisit: NOW - DAY },
  { source: 'history', url: 'https://gist.github.com/', title: 'Gists', visitCount: 3, lastVisit: NOW - 20 * DAY },
  { source: 'history', url: 'https://news.ycombinator.com/', title: 'Hacker News', visitCount: 30, lastVisit: NOW - 2 * DAY },
  { source: 'history', url: 'https://example.com/git-guide', title: 'A guide to git', visitCount: 1, lastVisit: NOW - 60 * DAY },
  { source: 'history', url: 'https://www.figma.com/files', title: 'Figma', visitCount: 25, lastVisit: NOW - 3 * 3_600_000 },
];

const tabs = [
  tab(1, 'https://mail.google.com/', 'Boîte de réception', NOW - 60_000),
  tab(2, 'https://docs.wxt.dev/', 'Documentation API', NOW - 3_600_000),
  tab(3, 'https://linear.app/', 'Refonte du site', NOW - 5_000),
];

const commands = [
  command('tab.reload', "Recharger l'onglet", ['reload']),
  command('browser.newTab', 'Nouvel onglet'),
];

const items = buildCorpusItems({ tabs, pages, commands });
const titles = (sections: Section[]) => sections.flatMap((s) => s.items.map((r) => r.item.title));
const results = (sections: Section[]) => titles(sections.filter((s) => s.id === 'results'));

describe('search', () => {
  const ranker = createRanker(items, { usage: emptyUsage(), now: NOW, currentTabId: 3 });

  it('puts a domain prefix match first', () => {
    expect(results(ranker.rank('gith', null))[0]).toBe('GitHub');
  });

  it('is accent insensitive and matches open tabs', () => {
    expect(results(ranker.rank('reception', null))[0]).toBe('Boîte de réception');
  });

  it('tolerates a typo', () => {
    expect(results(ranker.rank('figam', null))).toContain('Figma');
  });

  it('matches commands through keywords', () => {
    expect(results(ranker.rank('reload', null))[0]).toBe("Recharger l'onglet");
  });

  it('matches out of order terms', () => {
    expect(results(ranker.rank('news hacker', null))[0]).toBe('Hacker News');
  });

  it('demotes the current tab', () => {
    expect(results(ranker.rank('site', null)).at(-1)).toBe('Refonte du site');
  });

  it('offers a web search after a strong match', () => {
    expect(ranker.rank('gith', null).map((s) => s.id)).toEqual(['results', 'web']);
  });

  it('puts the web search first when nothing matches well', () => {
    expect(ranker.rank('best pizza recipe', null)[0]?.id).toBe('web');
  });

  it('offers to navigate to a typed URL', () => {
    expect(ranker.rank('vitest.dev', null)[0]).toMatchObject({
      id: 'go',
      items: [{ item: { url: 'https://vitest.dev' } }],
    });
  });

  it('prefers switching to an open tab over navigating to it', () => {
    expect(ranker.rank('docs.wxt.dev', null)[0]?.items[0]?.item).toMatchObject({ kind: 'tab', tabId: 2 });
  });

  it('restricts results to the scope', () => {
    const sections = ranker.rank('o', 'commands');
    expect(sections).toHaveLength(1);
    expect(sections[0]!.items.every(({ item }) => item.kind === 'command')).toBe(true);
  });
});

describe('learning', () => {
  it('ranks what was picked for this prefix first', () => {
    let usage = emptyUsage();
    usage = recordPick(usage, 'url:example.com/git-guide', 'gi', NOW);
    usage = recordPick(usage, 'url:example.com/git-guide', 'gi', NOW);
    const ranker = createRanker(items, { usage, now: NOW });
    expect(results(ranker.rank('gi', null))[0]).toBe('A guide to git');
  });
});

describe('suggestions', () => {
  const ranker = createRanker(items, { usage: emptyUsage(), now: NOW, currentTabId: 3 });
  const sections = ranker.rank('', null);

  it('lists recently used tabs, without the current one', () => {
    expect(titles(sections.filter((s) => s.id === 'tabs'))).toEqual(['Boîte de réception', 'Documentation API']);
  });

  it('suggests popular pages and never repeats an item', () => {
    expect(titles(sections.filter((s) => s.id === 'suggested'))[0]).toBe('GitHub');
    const all = titles(sections);
    expect(new Set(all).size).toBe(all.length);
  });
});
