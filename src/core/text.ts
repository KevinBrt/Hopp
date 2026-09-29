import uFuzzy from '@leeoniya/ufuzzy';

/**
 * Lowercase, accent-free, single-spaced text. `latinize` maps each accented
 * char to exactly one char, so offsets stay valid for highlighting.
 */
export function normalizeText(text: string): string {
  return uFuzzy.latinize(text.toLowerCase()).replace(/\s+/g, ' ').trimStart();
}

/** Same as `normalizeText` but keeps a 1:1 char mapping (no trimming/collapsing). */
export function foldText(text: string): string {
  return uFuzzy.latinize(text.toLowerCase());
}
