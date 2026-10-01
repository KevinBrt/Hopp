/**
 * Turns the corpus + a query into ordered sections.
 *
 * Score = match quality (dominant) + learned picks for this query + page
 * popularity + habits + small per-kind biases. With an empty query the
 * palette shows smart suggestions instead: recently used tabs, habitual
 * pages for this time of day, and recent history.
 */
import { usageKey } from './corpus';
import type { CorpusItem, NavigateItem, PaletteItem, TabItem, WebSearchItem } from './items';
import { buildIndex, findMatches } from './matcher';
import { getScope, type ScopeId } from './scopes';
import { frecency, tabRecency } from './signals';
import { normalizeText } from './text';
import { habitScore, learnedKeys, learnedScore, type UsageData } from './usage';
import { displayUrl, normalizeUrl, parseNavigableInput } from './url';

export type SectionId =
  | 'go'
  | 'site'
  | 'results'
  | 'web'
  | 'tabs'
  | 'suggested'
  | 'recent'
  | 'commands'
  | 'bookmarks'
  | 'history';

export interface RankedItem {
  item: PaletteItem;
  highlights?: number[];
}

export interface Section {
  id: SectionId;
  items: RankedItem[];
}

export interface RankerContext {
  usage: UsageData;
  now: number;
  currentTabId?: number;
}

export interface Ranker {
  rank(query: string, scope: ScopeId | null): Section[];
}

const WEIGHTS = {
  quality: 100,
  learned: 45,
  frecency: 28,
  habit: 12,
  tab: 8,
  tabRecency: 6,
  exactCommand: 10,
  currentTab: -60,
  /** Learned picks that no longer match the text still get a base quality. */
  learnedOnlyQuality: 0.4,
} as const;

const LIMITS = { results: 30, tabs: 5, suggested: 4, recent: 4, browse: 60 } as const;

/** A top result at least this good goes before the web search entry. */
const STRONG_QUALITY = 0.75;
const STRONG_LEARNED = 0.3;

interface Scored {
  item: CorpusItem;
  score: number;
  quality: number;
  learned: number;
  highlights: number[];
}

export function createRanker(items: CorpusItem[], context: RankerContext): Ranker {
  const index = buildIndex(items);
  const { usage, now, currentTabId } = context;

  const byUsageKey = new Map<string, CorpusItem[]>();
  for (const item of items) {
    const key = usageKey(item);
    if (!key) continue;
    const list = byUsageKey.get(key);
    if (list) list.push(item);
    else byUsageKey.set(key, [item]);
  }

  // Query independent scores, computed lazily once per palette session.
  const habitCache = new Map<string, number>();
  const habitOf = (item: PaletteItem): number => {
    const key = usageKey(item);
    if (!key) return 0;
    let value = habitCache.get(key);
    if (value === undefined) {
      value = habitScore(usage, key, now);
      habitCache.set(key, value);
    }
    return value;
  };

  const popularityOf = (item: CorpusItem): number =>
    item.kind === 'command' ? 0 : frecency(item.signals, now);

  const isCurrentTab = (item: PaletteItem) => item.kind === 'tab' && item.tabId === currentTabId;

  function score(item: CorpusItem, quality: number, learned: number): number {
    let total = WEIGHTS.quality * quality + WEIGHTS.learned * learned + WEIGHTS.habit * habitOf(item);
    switch (item.kind) {
      case 'tab':
        total += WEIGHTS.frecency * popularityOf(item);
        total += WEIGHTS.tab + WEIGHTS.tabRecency * tabRecency(item.lastAccessed, now);
        if (isCurrentTab(item)) total += WEIGHTS.currentTab;
        break;
      case 'page':
        total += WEIGHTS.frecency * popularityOf(item);
        break;
      case 'command':
        if (quality >= 0.85) total += WEIGHTS.exactCommand;
        break;
    }
    return total;
  }

  function search(query: string, scope: ScopeId | null): Section[] {
    const normalized = normalizeText(query).trim();
    const accepts = scope ? getScope(scope).accepts : () => true;
    const scored = new Map<string, Scored>();

    const learnedFor = (item: CorpusItem) => {
      const key = usageKey(item);
      return key ? learnedScore(usage, normalized, key, now) : 0;
    };

    for (const { entry, quality, highlights } of findMatches(index, query)) {
      if (!accepts(entry.item)) continue;
      const learned = learnedFor(entry.item);
      scored.set(entry.item.id, {
        item: entry.item,
        quality,
        learned,
        highlights,
        score: score(entry.item, quality, learned),
      });
    }

    // Items picked for this query before, even if their title changed since.
    for (const key of learnedKeys(usage, normalized)) {
      for (const item of byUsageKey.get(key) ?? []) {
        if (scored.has(item.id) || !accepts(item)) continue;
        const learned = learnedFor(item);
        const quality = WEIGHTS.learnedOnlyQuality;
        scored.set(item.id, { item, quality, learned, highlights: [], score: score(item, quality, learned) });
      }
    }

    const ranked = [...scored.values()].sort((a, b) => b.score - a.score).slice(0, LIMITS.results);
    const results: Section = {
      id: 'results',
      items: ranked.map(({ item, highlights }) => ({ item, highlights })),
    };
    if (scope) return [results];

    const sections: Section[] = [];
    const top = ranked[0];

    const url = parseNavigableInput(query);
    const topUrl = top && top.item.kind !== 'command' ? normalizeUrl(top.item.url) : null;
    if (url && normalizeUrl(url) !== topUrl) {
      const navigate: NavigateItem = { kind: 'navigate', id: 'navigate', title: displayUrl(url), url };
      sections.push({ id: 'go', items: [{ item: navigate }] });
    }

    const web: Section = {
      id: 'web',
      items: [{ item: { kind: 'search', id: 'web-search', title: query.trim(), query: query.trim() } satisfies WebSearchItem }],
    };
    const strong = !!top && (top.quality >= STRONG_QUALITY || top.learned >= STRONG_LEARNED);
    if (strong || url) sections.push(results, web);
    else sections.push(web, results);

    return sections.filter((section) => section.items.length > 0);
  }

  function suggest(): Section[] {
    const tabs = items
      .filter((item): item is TabItem => item.kind === 'tab' && !isCurrentTab(item))
      .map((item) => ({ item, weight: 0.65 * tabRecency(item.lastAccessed, now) + 0.35 * habitOf(item) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, LIMITS.tabs)
      .map(({ item }) => item);

    const shown = new Set(tabs.map((item) => item.id));

    const suggested = items
      .filter((item) => item.kind === 'page' || (item.kind === 'command' && habitOf(item) > 0.3))
      .map((item) => ({ item, weight: 0.55 * popularityOf(item) + 0.45 * habitOf(item) }))
      .filter(({ weight }) => weight > 0.12)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, LIMITS.suggested)
      .map(({ item }) => item);
    for (const item of suggested) shown.add(item.id);

    const recent = items
      .filter((item) => item.kind === 'page' && item.inHistory && !shown.has(item.id))
      .sort((a, b) => lastVisit(b) - lastVisit(a))
      .slice(0, LIMITS.recent);

    return (
      [
        { id: 'tabs', items: tabs.map((item) => ({ item })) },
        { id: 'suggested', items: suggested.map((item) => ({ item })) },
        { id: 'recent', items: recent.map((item) => ({ item })) },
      ] satisfies Section[]
    ).filter((section) => section.items.length > 0);
  }

  function browse(scope: ScopeId): Section[] {
    const accepts = getScope(scope).accepts;
    const candidates = items.filter(accepts);
    const weight = (item: CorpusItem): number => {
      switch (scope) {
        case 'commands':
          return habitOf(item);
        case 'tabs':
          return isCurrentTab(item) ? -1 : item.kind === 'tab' ? item.lastAccessed : 0;
        case 'bookmarks':
          return 0.5 * popularityOf(item) + 0.5 * habitOf(item);
        case 'history':
          return lastVisit(item);
      }
    };
    // Stable sort keeps the registry order for commands with equal habits.
    const sorted = candidates
      .map((item) => ({ item, weight: weight(item) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, LIMITS.browse);
    return [{ id: scope, items: sorted.map(({ item }) => ({ item })) }];
  }

  return {
    rank(query, scope) {
      if (query.trim()) return search(query, scope);
      return scope ? browse(scope) : suggest();
    },
  };
}

function lastVisit(item: CorpusItem): number {
  return item.kind === 'command' ? 0 : item.signals.lastVisit;
}
