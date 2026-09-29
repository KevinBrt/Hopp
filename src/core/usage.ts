/**
 * Adaptive learning: what the user picks, for which query and when.
 *
 * Two structures, both bounded in size:
 * - `queries`: for every typed prefix, which items were chosen (à la
 *   Firefox's "input history"). Typing "gi" after having picked GitHub for
 *   "git" ranks GitHub first.
 * - `items`: recent pick timestamps per item, used for habits (frequency,
 *   recency and time of day) when the query is empty.
 */
import { normalizeText } from './text';

export interface QueryPick {
  /** Number of picks. */
  n: number;
  /** Last pick, epoch ms. */
  t: number;
}

export interface UsageData {
  version: 1;
  items: Record<string, number[]>;
  queries: Record<string, Record<string, QueryPick>>;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const MAX_TIMESTAMPS_PER_ITEM = 20;
const MAX_ITEMS = 600;
const MAX_PREFIX_LENGTH = 24;
const MAX_PICKS_PER_PREFIX = 6;
const MAX_PREFIXES = 1_000;

const QUERY_HALF_LIFE = 30 * DAY;
const HABIT_HALF_LIFE = 10 * DAY;

export function emptyUsage(): UsageData {
  return { version: 1, items: {}, queries: {} };
}

const decay = (age: number, halfLife: number) => 0.5 ** (Math.max(0, age) / halfLife);

/** Returns a new `UsageData` including the pick of `key` for `query`. */
export function recordPick(data: UsageData, key: string, query: string, now: number): UsageData {
  const items = { ...data.items };
  items[key] = [now, ...(items[key] ?? [])].slice(0, MAX_TIMESTAMPS_PER_ITEM);

  const queries = { ...data.queries };
  const normalized = normalizeText(query).slice(0, MAX_PREFIX_LENGTH);
  for (let length = 1; length <= normalized.length; length++) {
    const prefix = normalized.slice(0, length);
    if (prefix.endsWith(' ')) continue;
    const picks = { ...queries[prefix] };
    const previous = picks[key];
    picks[key] = { n: (previous?.n ?? 0) + 1, t: now };
    // The pick being recorded always survives the pruning.
    queries[prefix] = keepTop(picks, MAX_PICKS_PER_PREFIX, (pick, k) =>
      k === key ? Infinity : pick.n * decay(now - pick.t, QUERY_HALF_LIFE),
    );
  }

  return {
    version: 1,
    items: keepTop(items, MAX_ITEMS, (stamps) => stamps[0] ?? 0),
    queries: keepTop(queries, MAX_PREFIXES, (picks) => Math.max(...Object.values(picks).map((p) => p.t))),
  };
}

/** Returns a new `UsageData` without any trace of `key`. */
export function forgetItem(data: UsageData, key: string): UsageData {
  const items = { ...data.items };
  delete items[key];
  const queries: UsageData['queries'] = {};
  for (const [prefix, picks] of Object.entries(data.queries)) {
    if (!(key in picks)) {
      queries[prefix] = picks;
      continue;
    }
    const rest = { ...picks };
    delete rest[key];
    if (Object.keys(rest).length > 0) queries[prefix] = rest;
  }
  return { version: 1, items, queries };
}

/**
 * How strongly `key` was associated with this query in the past, 0..1.
 * Combines the share of picks (always choosing the same result for "gh"
 * is a strong signal) and their absolute number, decayed over time.
 */
export function learnedScore(data: UsageData, normalizedQuery: string, key: string, now: number): number {
  const picks = data.queries[normalizedQuery.slice(0, MAX_PREFIX_LENGTH)];
  const pick = picks?.[key];
  if (!picks || !pick) return 0;
  let total = 0;
  for (const p of Object.values(picks)) total += p.n;
  const share = pick.n / total;
  const volume = Math.min(1, Math.log2(1 + pick.n) / 2);
  return (0.6 * share + 0.4 * volume) * decay(now - pick.t, QUERY_HALF_LIFE);
}

/** Keys that were picked for this exact (normalized) query. */
export function learnedKeys(data: UsageData, normalizedQuery: string): string[] {
  return Object.keys(data.queries[normalizedQuery.slice(0, MAX_PREFIX_LENGTH)] ?? {});
}

function hourDistance(a: number, b: number): number {
  const diff = Math.abs(new Date(a).getHours() - new Date(b).getHours());
  return Math.min(diff, 24 - diff);
}

/**
 * Habit strength of an item right now, 0..1: frequent and recent picks
 * count, and picks made around the same time of day count more (the
 * morning dashboard, the evening streaming site…).
 */
export function habitScore(data: UsageData, key: string, now: number): number {
  const stamps = data.items[key];
  if (!stamps?.length) return 0;
  let sum = 0;
  for (const stamp of stamps) {
    const distance = hourDistance(stamp, now);
    const timeOfDay = distance <= 1 ? 0.6 : distance <= 2 ? 0.3 : 0;
    sum += decay(now - stamp, HABIT_HALF_LIFE) * (1 + timeOfDay);
  }
  return 1 - Math.exp(-sum / 3);
}

function keepTop<T>(
  record: Record<string, T>,
  max: number,
  weight: (value: T, key: string) => number,
): Record<string, T> {
  const entries = Object.entries(record);
  if (entries.length <= max) return record;
  entries.sort((a, b) => weight(b[1], b[0]) - weight(a[1], a[0]));
  return Object.fromEntries(entries.slice(0, max));
}
