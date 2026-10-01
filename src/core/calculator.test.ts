import { describe, expect, it } from 'vitest';
import { calculationItem, evaluate, formatResult, roundResult, withCalculation } from './calculator';

describe('evaluate', () => {
  it.each([
    ['12*1.2', 14.4],
    ['12 * 1,2', 14.4],
    ['2 + 3 * 4', 14],
    ['(2 + 3) * 4', 20],
    ['2^3^2', 512],
    ['-2^2', -4],
    ['10 / 4', 2.5],
    ['6 × 7', 42],
    ['9 ÷ 3', 3],
    ['15% de 340', 51],
    ['15 % of 340', 51],
    ['340 + 15%', 391],
    ['340 - 10%', 306],
    ['15% * 2', 0.3],
    ['50%', 0.5],
    ['-(3 - 5)', 2],
  ])('%s = %s', (input, expected) => {
    expect(roundResult(evaluate(input)!)).toBe(expected);
  });

  it.each(['42', '-3', '', 'github.com', 'hello 2+2', '2 +', '(2+3', '1/0', '1.2.3', 'v1.2-beta', '12,'])(
    '"%s" is not a calculation',
    (input) => {
      expect(evaluate(input)).toBeNull();
    },
  );

  it('removes floating point noise', () => {
    expect(roundResult(evaluate('0.1 + 0.2')!)).toBe(0.3);
  });
});

describe('formatting', () => {
  it('follows the locale, grouping only for display', () => {
    expect(formatResult(1234.5, 'fr')).toMatch(/^1\s234,5$/);
    expect(formatResult(1234.5, 'fr', false)).toBe('1234,5');
    expect(formatResult(1234.5, 'en', false)).toBe('1234.5');
  });
});

describe('withCalculation', () => {
  it('puts the result first', () => {
    const sections = withCalculation([{ id: 'results', items: [] }], '12*1.2');
    expect(sections.map((s) => s.id)).toEqual(['calculation', 'results']);
    expect(sections[0]!.items[0]!.item).toEqual(calculationItem('12*1.2'));
  });

  it('leaves other queries untouched', () => {
    const sections = [{ id: 'results' as const, items: [] }];
    expect(withCalculation(sections, 'gith')).toBe(sections);
  });
});
