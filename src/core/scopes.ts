/**
 * Scopes restrict the palette to one kind of result. They are activated by
 * typing their prefix as the first character (e.g. "> reload").
 */
import type { PaletteItem } from './items';

export interface ScopeDefinition {
  id: ScopeId;
  prefix: string;
  accepts: (item: PaletteItem) => boolean;
}

export type ScopeId = 'commands' | 'tabs' | 'bookmarks' | 'history';

export const SCOPES: readonly ScopeDefinition[] = [
  { id: 'commands', prefix: '>', accepts: (item) => item.kind === 'command' },
  { id: 'tabs', prefix: '@', accepts: (item) => item.kind === 'tab' },
  {
    id: 'bookmarks',
    prefix: '*',
    accepts: (item) => (item.kind === 'page' || item.kind === 'tab') && item.signals.bookmarked,
  },
  { id: 'history', prefix: '#', accepts: (item) => item.kind === 'page' && item.inHistory },
];

export function getScope(id: ScopeId): ScopeDefinition {
  return SCOPES.find((scope) => scope.id === id)!;
}

/** Detects a scope prefix at the start of the input. */
export function parseScopePrefix(input: string): { scope: ScopeId; rest: string } | null {
  const scope = SCOPES.find((s) => input.startsWith(s.prefix));
  return scope ? { scope: scope.id, rest: input.slice(scope.prefix.length).trimStart() } : null;
}
