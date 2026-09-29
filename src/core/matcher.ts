/**
 * Text matching. uFuzzy finds candidates (typo tolerant, out-of-order
 * terms, accent-insensitive); each candidate then gets a 0..1 quality that
 * rewards what people actually mean when typing into a launcher: a domain
 * prefix ("gith" → github.com), a title prefix, word starts…
 */
import uFuzzy from '@leeoniya/ufuzzy';
import type { CorpusItem } from './items';
import { foldText } from './text';
import { displayUrl, hostname } from './url';

export interface IndexEntry {
  item: CorpusItem;
  /** Folded title, first part of the haystack (so ranges map onto it). */
  title: string;
  host: string;
  url: string;
  extra: string;
}

export interface SearchIndex {
  entries: IndexEntry[];
  haystack: string[];
}

export interface Match {
  entry: IndexEntry;
  quality: number;
  /** Highlight ranges in the title: [start0, end0, start1, end1, …]. */
  highlights: number[];
}

const fuzzy = new uFuzzy({
  unicode: true,
  interSplit: "[^\\p{L}\\d']+",
  intraSplit: '\\p{Ll}\\p{Lu}',
  intraBound: '\\p{L}\\d|\\d\\p{L}|\\p{Ll}\\p{Lu}',
  intraChars: "[\\p{L}\\d']",
  intraContr: "'\\p{L}{1,2}\\b",
  // One typo per term (substitution, transposition, insertion or deletion).
  intraMode: 1, // SingleError
  intraIns: 1,
});

/** uFuzzy computes detailed info (ranges, fuzz) up to this many candidates. */
const INFO_THRESHOLD = 1_500;

function toEntry(item: CorpusItem): IndexEntry {
  switch (item.kind) {
    case 'tab':
    case 'page':
      return {
        item,
        title: foldText(item.title),
        host: foldText(hostname(item.url)),
        url: foldText(displayUrl(item.url)),
        extra: foldText(item.kind === 'tab' ? (item.groupTitle ?? '') : (item.folder ?? '')),
      };
    case 'command':
      return { item, title: foldText(item.title), host: '', url: '', extra: foldText(item.keywords.join(' ')) };
  }
}

export function buildIndex(items: CorpusItem[]): SearchIndex {
  const entries = items.map(toEntry);
  const haystack = entries.map((e) => `${e.title} ${e.url} ${e.extra}`);
  return { entries, haystack };
}

function atWordStart(text: string, term: string): boolean {
  let index = text.indexOf(term);
  while (index !== -1) {
    if (index === 0 || !/[\p{L}\d]/u.test(text[index - 1]!)) return true;
    index = text.indexOf(term, index + 1);
  }
  return false;
}

function termQuality(entry: IndexEntry, term: string): number {
  if (entry.host && entry.host.startsWith(term)) return 1;
  if (entry.title.startsWith(term)) return 0.95;
  if (atWordStart(entry.title, term)) return 0.85;
  if (atWordStart(entry.url, term) || atWordStart(entry.extra, term)) return 0.75;
  if (entry.title.includes(term)) return 0.6;
  if (entry.url.includes(term) || entry.extra.includes(term)) return 0.5;
  // Only matched thanks to typo tolerance.
  return 0.3;
}

function quality(entry: IndexEntry, needle: string, terms: string[], intraIns: number): number {
  let sum = 0;
  for (const term of terms) sum += termQuality(entry, term);
  let q = sum / terms.length;
  if (terms.length > 1 && entry.title.includes(needle)) q = Math.max(q, 0.9);
  q -= Math.min(0.12, intraIns * 0.04);
  // Among equal matches, prefer concise titles ("GitHub" over "GitHub · PR #1234 …").
  q -= Math.min(0.05, entry.title.length / 2_000);
  return q;
}

function titleRanges(ranges: number[] | undefined, titleLength: number): number[] {
  if (!ranges) return [];
  const out: number[] = [];
  for (let i = 0; i < ranges.length; i += 2) {
    const start = ranges[i]!;
    const end = Math.min(ranges[i + 1]!, titleLength);
    if (start < end) out.push(start, end);
  }
  return out;
}

function naiveRanges(title: string, terms: string[]): number[] {
  const out: number[] = [];
  for (const term of terms) {
    const start = title.indexOf(term);
    if (start !== -1) out.push(start, start + term.length);
  }
  return out;
}

export function findMatches(index: SearchIndex, query: string): Match[] {
  const needle = foldText(query).trim().replace(/\s+/g, ' ');
  if (!needle) return [];
  const terms = needle.split(' ');

  const outOfOrder = terms.length > 1 ? Math.min(terms.length, 3) : 0;
  const [idxs, info, order] = fuzzy.search(index.haystack, needle, outOfOrder, INFO_THRESHOLD);
  if (!idxs?.length) return [];

  const matches: Match[] = [];
  if (info && order) {
    for (const position of order) {
      const entry = index.entries[info.idx[position]!]!;
      matches.push({
        entry,
        quality: quality(entry, needle, terms, info.intraIns[position] ?? 0),
        highlights: titleRanges(info.ranges[position], entry.title.length),
      });
    }
  } else {
    for (const idx of idxs) {
      const entry = index.entries[idx]!;
      matches.push({
        entry,
        quality: quality(entry, needle, terms, 0),
        highlights: naiveRanges(entry.title, terms),
      });
    }
  }
  return matches;
}
