import { browser, type Browser } from 'wxt/browser';
import type { RawPage } from '@/core/corpus';
import { cached } from './cache';

/**
 * Depth 0 is the invisible root, depth 1 the built-in folders ("Bookmarks
 * bar", "Other bookmarks"…): both are noise in a folder path.
 */
function collect(nodes: Browser.bookmarks.BookmarkTreeNode[], path: string[], depth: number, out: RawPage[]): void {
  for (const node of nodes) {
    if (node.url) {
      out.push({ source: 'bookmark', url: node.url, title: node.title, folder: path.join(' / ') || undefined });
    } else if (node.children) {
      collect(node.children, depth >= 2 && node.title ? [...path, node.title] : path, depth + 1, out);
    }
  }
}

export const loadBookmarks = cached(async (): Promise<RawPage[]> => {
  const out: RawPage[] = [];
  collect(await browser.bookmarks.getTree(), [], 0, out);
  return out;
}, 60_000);
