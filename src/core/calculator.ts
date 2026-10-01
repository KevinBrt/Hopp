/**
 * Inline calculator: "12*1.2", "15% de 340", "340 + 15%", "(2+3)^2".
 * A small recursive descent parser, never `eval`.
 *
 *   expression := term (("+" | "-") term)*
 *   term       := unary (("*" | "/") unary)*
 *   unary      := ("-" | "+") unary | power      so -2^2 = -4
 *   power      := percent ("^" unary)?          right associative
 *   percent    := primary ("%" (("de" | "of") unary)?)?
 *   primary    := number | "(" expression ")"
 *
 * "a + b%" adds b percent of a, like a pocket calculator.
 */
import type { CalculationItem } from './items';
import type { Section } from './ranker';

type Token = { type: 'number'; value: number } | { type: 'op'; value: string } | { type: 'of' };

const OPERATORS = new Set(['+', '-', '*', '/', '^', '%', '(', ')']);
const ALIASES: Record<string, string> = { '×': '*', '÷': '/', '−': '-' };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  const text = input.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const char = text[i]!;
    if (/\s/.test(char)) {
      i++;
    } else if (/[\d.,]/.test(char)) {
      const match = /^\d*(?:[.,]\d+)?/.exec(text.slice(i))![0];
      if (!match || !/\d/.test(match)) return null;
      tokens.push({ type: 'number', value: Number(match.replace(',', '.')) });
      i += match.length;
    } else if (OPERATORS.has(char) || char in ALIASES) {
      tokens.push({ type: 'op', value: ALIASES[char] ?? char });
      i++;
    } else {
      const word = /^(de|of)\b/.exec(text.slice(i));
      if (!word) return null;
      tokens.push({ type: 'of' });
      i += word[0].length;
    }
  }
  return tokens;
}

/** Value of a sub-expression, remembering if it was a bare "b%". */
interface Value {
  value: number;
  percent: boolean;
}

/** A percentage used anywhere but as "+ b%" is just a fraction. */
const plain = ({ value, percent }: Value) => (percent ? value / 100 : value);

class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): number | null {
    const result = this.expression();
    return this.position === this.tokens.length ? plain(result) : null;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private takeOp(...ops: string[]): string | null {
    const token = this.peek();
    if (token?.type === 'op' && ops.includes(token.value)) {
      this.position++;
      return token.value;
    }
    return null;
  }

  private expression(): Value {
    let left = this.term();
    for (let op = this.takeOp('+', '-'); op; op = this.takeOp('+', '-')) {
      const right = this.term();
      const base = plain(left);
      const amount = right.percent ? (base * right.value) / 100 : right.value;
      left = { value: op === '+' ? base + amount : base - amount, percent: false };
    }
    return left;
  }

  private term(): Value {
    let left = this.unary();
    for (let op = this.takeOp('*', '/'); op; op = this.takeOp('*', '/')) {
      const right = this.unary();
      const value = plain(right);
      left = { value: op === '*' ? plain(left) * value : plain(left) / value, percent: false };
    }
    return left;
  }

  private power(): Value {
    const base = this.percent();
    if (!this.takeOp('^')) return base;
    return { value: plain(base) ** plain(this.unary()), percent: false };
  }

  private unary(): Value {
    const sign = this.takeOp('-', '+');
    if (!sign) return this.power();
    const operand = this.unary();
    return { value: sign === '-' ? -operand.value : operand.value, percent: operand.percent };
  }

  private percent(): Value {
    const base = this.primary();
    if (!this.takeOp('%')) return base;
    if (this.peek()?.type === 'of') {
      this.position++;
      return { value: (base.value / 100) * plain(this.unary()), percent: false };
    }
    return { value: base.value, percent: true };
  }

  private primary(): Value {
    const token = this.peek();
    if (token?.type === 'number') {
      this.position++;
      return { value: token.value, percent: false };
    }
    if (this.takeOp('(')) {
      const inner = this.expression();
      if (!this.takeOp(')')) throw new SyntaxError('Missing )');
      return { value: plain(inner), percent: false };
    }
    throw new SyntaxError('Number expected');
  }
}

/** Has at least one operation: a lone number ("42", "-3") is not a calculation. */
function hasOperation(tokens: Token[]): boolean {
  return tokens.some(
    (token, index) =>
      token.type === 'of' || (token.type === 'op' && token.value !== '(' && token.value !== ')' && !(token.value === '-' && index === 0)),
  );
}

/** The result, or null when the input is not a (finite) calculation. */
export function evaluate(input: string): number | null {
  const tokens = tokenize(input);
  if (!tokens?.length || !hasOperation(tokens)) return null;
  try {
    const value = new Parser(tokens).parse();
    return value !== null && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Removes binary floating point noise: 0.1 + 0.2 → 0.3. */
export function roundResult(value: number): number {
  return Number.parseFloat(value.toPrecision(12));
}

export function calculationItem(input: string): CalculationItem | null {
  const value = evaluate(input);
  if (value === null) return null;
  return { kind: 'calculation', id: 'calculation', title: input.trim(), expression: input.trim(), value: roundResult(value) };
}

/** "14,4" in French, "14.4" in English; grouping for display only ("1 234,5"). */
export function formatResult(value: number, locale: string, grouping = true): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 10, useGrouping: grouping }).format(value);
}

/** Puts the calculation first when the input is one. */
export function withCalculation(sections: Section[], input: string): Section[] {
  const item = calculationItem(input);
  return item ? [{ id: 'calculation', items: [{ item }] }, ...sections] : sections;
}
