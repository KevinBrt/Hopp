import { describe, expect, it } from 'vitest';
import { emptyUsage, forgetItem, habitScore, learnedKeys, learnedScore, recordPick } from './usage';

const NOW = new Date('2026-09-29T09:00:00').getTime();
const HOUR = 3_600_000;

describe('learning', () => {
  it('learns every prefix of the query', () => {
    const data = recordPick(emptyUsage(), 'url:github.com', 'Git', NOW);
    expect(learnedKeys(data, 'g')).toEqual(['url:github.com']);
    expect(learnedKeys(data, 'git')).toEqual(['url:github.com']);
    expect(learnedKeys(data, 'gith')).toEqual([]);
  });

  it('prefers what is picked most for a prefix', () => {
    let data = emptyUsage();
    data = recordPick(data, 'url:gmail.com', 'g', NOW);
    data = recordPick(data, 'url:github.com', 'g', NOW);
    data = recordPick(data, 'url:github.com', 'g', NOW);
    expect(learnedScore(data, 'g', 'url:github.com', NOW)).toBeGreaterThan(learnedScore(data, 'g', 'url:gmail.com', NOW));
  });

  it('is accent and case insensitive', () => {
    const data = recordPick(emptyUsage(), 'cmd:x', 'Réglages', NOW);
    expect(learnedKeys(data, 'regl')).toEqual(['cmd:x']);
  });

  it('forgets an item everywhere', () => {
    let data = recordPick(emptyUsage(), 'a', 'abc', NOW);
    data = recordPick(data, 'b', 'abc', NOW);
    data = forgetItem(data, 'a');
    expect(learnedKeys(data, 'ab')).toEqual(['b']);
    expect(data.items.a).toBeUndefined();
  });

  it('keeps the new pick even when the prefix is full', () => {
    let data = emptyUsage();
    for (let i = 0; i < 10; i++) for (let n = 0; n <= i; n++) data = recordPick(data, `k${i}`, 'x', NOW);
    data = recordPick(data, 'new', 'x', NOW);
    expect(learnedKeys(data, 'x')).toContain('new');
  });
});

describe('habits', () => {
  it('weighs picks made at the same time of day more', () => {
    let morning = emptyUsage();
    let evening = emptyUsage();
    for (let day = 1; day <= 5; day++) {
      morning = recordPick(morning, 'k', '', NOW - day * 24 * HOUR);
      evening = recordPick(evening, 'k', '', NOW - day * 24 * HOUR + 10 * HOUR);
    }
    expect(habitScore(morning, 'k', NOW)).toBeGreaterThan(habitScore(evening, 'k', NOW));
  });
});
