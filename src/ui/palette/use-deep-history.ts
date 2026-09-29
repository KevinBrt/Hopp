import { useEffect, useState } from 'react';
import type { PageItem } from '@/core/items';
import { callBackground } from '@/shared/messaging';

const DEBOUNCE = 140;
const MIN_LENGTH = 2;
const MAX_PAGES = 400;

/**
 * The corpus only holds recent history. While typing, the whole history is
 * searched in the background and found pages are accumulated: the ranker
 * re-matches everything, so pages irrelevant to the new query just vanish.
 */
export function useDeepHistory(query: string, enabled: boolean): PageItem[] {
  const [pages, setPages] = useState<PageItem[]>([]);

  useEffect(() => {
    const text = query.trim();
    if (!enabled || text.length < MIN_LENGTH) return;
    let alive = true;
    const timer = setTimeout(() => {
      callBackground('searchHistory', { query: text })
        .then((found) => {
          if (!alive || found.length === 0) return;
          setPages((previous) => {
            const known = new Set(previous.map((page) => page.id));
            const fresh = found.filter((page) => !known.has(page.id));
            return fresh.length ? [...fresh, ...previous].slice(0, MAX_PAGES) : previous;
          });
        })
        .catch(() => {});
    }, DEBOUNCE);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, enabled]);

  return pages;
}
