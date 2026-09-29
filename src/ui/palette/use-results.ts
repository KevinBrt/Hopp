import { useMemo } from 'react';
import { withExtraPages, type Corpus } from '@/core/corpus';
import type { PageItem } from '@/core/items';
import { createRanker, type Section } from '@/core/ranker';
import type { ScopeId } from '@/core/scopes';

export function useResults(
  corpus: Corpus | null,
  extraPages: PageItem[],
  removed: ReadonlySet<string>,
  query: string,
  scope: ScopeId | null,
): Section[] {
  // Rebuilt only when the data changes, not on every keystroke.
  const ranker = useMemo(() => {
    if (!corpus) return null;
    let items = withExtraPages(corpus.items, extraPages);
    if (removed.size) items = items.filter((item) => !removed.has(item.id));
    return createRanker(items, { usage: corpus.usage, now: Date.now(), currentTabId: corpus.context.currentTabId });
  }, [corpus, extraPages, removed]);

  return useMemo(() => ranker?.rank(query, scope) ?? [], [ranker, query, scope]);
}
