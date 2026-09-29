/** How each kind of item is presented and what it can do. */
import { i18n } from '#i18n';
import type { PaletteContext } from '@/core/corpus';
import type { PageItem, PaletteItem, TabItem } from '@/core/items';
import type { SectionId } from '@/core/ranker';
import type { ScopeId } from '@/core/scopes';
import { hostname } from '@/core/url';

/** Where an item lives. Empty for extension pages: their host is an unreadable id. */
const siteOf = (url: string) => (/^(chrome|moz)-extension:/.test(url) ? '' : hostname(url));

const joinSubtitle = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined;

export type ActionKind = 'switch' | 'open' | 'run' | 'search' | 'go';

export interface ItemView {
  title: string;
  subtitle?: string;
  action: ActionKind;
  /** Last visit, shown as a relative time. */
  time?: number;
}

export function describeItem(item: PaletteItem, context: PaletteContext): ItemView {
  switch (item.kind) {
    case 'tab':
      return {
        title: item.title,
        subtitle: joinSubtitle(item.groupTitle, siteOf(item.url)),
        action: 'switch',
      };
    case 'page':
      return {
        title: item.title,
        subtitle: joinSubtitle(item.inHistory ? undefined : item.folder, siteOf(item.url)),
        action: 'open',
        time: item.signals.lastVisit || undefined,
      };
    case 'command':
      return { title: item.title, action: 'run' };
    case 'navigate':
      return { title: item.title, action: 'go' };
    case 'search':
      return {
        title: `“${item.query}”`,
        subtitle: context.searchEngineName
          ? i18n.t('palette.searchWith', [context.searchEngineName])
          : i18n.t('palette.searchDefault'),
        action: 'search',
      };
  }
}

/** Ctrl/⌘+Enter and Shift+Enter change where it opens. */
export const supportsDisposition = (item: PaletteItem) =>
  item.kind === 'page' || item.kind === 'navigate' || item.kind === 'search';

/** Shift+Delete closes the tab / removes the page from history. */
export const canDismiss = (item: PaletteItem): item is TabItem | PageItem =>
  item.kind === 'tab' || (item.kind === 'page' && item.inHistory);

export const actionLabel = (action: ActionKind): string =>
  ({
    switch: () => i18n.t('palette.actions.switch'),
    open: () => i18n.t('palette.actions.open'),
    run: () => i18n.t('palette.actions.run'),
    search: () => i18n.t('palette.actions.search'),
    go: () => i18n.t('palette.actions.go'),
  })[action]();

export const sectionLabel = (section: SectionId): string =>
  ({
    go: () => i18n.t('palette.sections.go'),
    results: () => i18n.t('palette.sections.results'),
    web: () => i18n.t('palette.sections.web'),
    tabs: () => i18n.t('palette.sections.tabs'),
    suggested: () => i18n.t('palette.sections.suggested'),
    recent: () => i18n.t('palette.sections.recent'),
    commands: () => i18n.t('palette.sections.commands'),
    bookmarks: () => i18n.t('palette.sections.bookmarks'),
    history: () => i18n.t('palette.sections.history'),
  })[section]();

export const scopeLabel = (scope: ScopeId): string =>
  ({
    commands: () => i18n.t('palette.scopes.commands'),
    tabs: () => i18n.t('palette.scopes.tabs'),
    bookmarks: () => i18n.t('palette.scopes.bookmarks'),
    history: () => i18n.t('palette.scopes.history'),
  })[scope]();

export const scopePlaceholder = (scope: ScopeId | null): string =>
  scope
    ? {
        commands: () => i18n.t('palette.placeholderScoped.commands'),
        tabs: () => i18n.t('palette.placeholderScoped.tabs'),
        bookmarks: () => i18n.t('palette.placeholderScoped.bookmarks'),
        history: () => i18n.t('palette.placeholderScoped.history'),
      }[scope]()
    : i18n.t('palette.placeholder');
