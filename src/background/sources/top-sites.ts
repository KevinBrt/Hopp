import { browser } from 'wxt/browser';
import type { RawPage } from '@/core/corpus';
import { cached } from './cache';

export const loadTopSites = cached(async (): Promise<RawPage[]> => {
  const sites = await browser.topSites.get();
  return sites.map((site, rank) => ({ source: 'top-site', url: site.url, title: site.title ?? '', topSiteRank: rank }));
}, 5 * 60_000);
