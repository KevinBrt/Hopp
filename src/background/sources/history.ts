import { browser, type Browser } from 'wxt/browser';
import type { RawPage } from '@/core/corpus';
import { isOwnPage } from '../context';
import { cached } from './cache';

const DAY = 86_400_000;
const WINDOW = 120 * DAY;
const MAX_RESULTS = 2_500;

function toRawPage(item: Browser.history.HistoryItem): RawPage | null {
  // Our own pages (options…) are noise in the history.
  if (!item.url || isOwnPage(item.url)) return null;
  return {
    source: 'history',
    url: item.url,
    title: item.title ?? '',
    visitCount: item.visitCount ?? 0,
    typedCount: item.typedCount ?? 0,
    lastVisit: item.lastVisitTime ?? 0,
  };
}

/** Recent history, the base of the corpus. */
export const loadHistory = cached(async (): Promise<RawPage[]> => {
  const items = await browser.history.search({ text: '', startTime: Date.now() - WINDOW, maxResults: MAX_RESULTS });
  return items.map(toRawPage).filter((page) => page !== null);
}, 30_000);

/** Full-text search in the whole history, for pages older than the window. */
export async function searchHistory(query: string, maxResults = 40): Promise<RawPage[]> {
  const items = await browser.history.search({ text: query, startTime: 0, maxResults });
  return items.map(toRawPage).filter((page) => page !== null);
}
