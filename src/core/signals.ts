/** Popularity scores derived from browser data. All return 0..1. */
import type { PageSignals } from './items';

const MINUTE = 60_000;
const DAY = 86_400_000;

function recencyWeight(lastVisit: number, now: number): number {
  if (!lastVisit) return 0.1;
  const days = (now - lastVisit) / DAY;
  if (days <= 1) return 1;
  if (days <= 4) return 0.85;
  if (days <= 14) return 0.65;
  if (days <= 31) return 0.45;
  if (days <= 90) return 0.25;
  return 0.1;
}

/**
 * Frequency × recency, Firefox style: a page visited a lot but not for
 * months weighs less than a page visited a few times this week. Typed
 * visits, bookmarks and top sites are strong intent signals.
 */
export function frecency(signals: PageSignals, now: number): number {
  const visits = Math.log2(1 + signals.visitCount) + 1.5 * Math.log2(1 + signals.typedCount);
  let score = visits * recencyWeight(signals.lastVisit, now);
  if (signals.bookmarked) score += 1;
  if (signals.topSiteRank >= 0) score += 2 * Math.max(0, 1 - signals.topSiteRank / 20);
  return score / (score + 6);
}

/** How recently a tab was focused: ~1 just now, 0.5 after 30 minutes. */
export function tabRecency(lastAccessed: number, now: number): number {
  if (!lastAccessed) return 0;
  const minutes = Math.max(0, now - lastAccessed) / MINUTE;
  return 1 / (1 + minutes / 30);
}
