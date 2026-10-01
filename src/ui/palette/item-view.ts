/** How each kind of item is presented and what it can do. */
import { i18n } from '#i18n';
import type { PaletteContext } from '@/core/corpus';
import type { PageItem, PaletteItem, TabItem } from '@/core/items';
import type { SectionId } from '@/core/ranker';
import type { ScopeId } from '@/core/scopes';
import { formatResult } from '@/core/calculator';
import { hostname } from '@/core/url';
import { browser } from 'wxt/browser';

/** Where an item lives. Empty for extension pages: their host is an unreadable id. */
const siteOf = (url: string) => (/^(chrome|moz)-extension:/.test(url) ? '' : hostname(url));

const joinSubtitle = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined;

export type ActionKind = 'switch' | 'open' | 'run' | 'search' | 'go' | 'copy';

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
    case 'calculation':
      return {
        title: `= ${formatResult(item.value, browser.i18n.getUILanguage())}`,
        subtitle: item.expression,
        action: 'copy',
      };
    case 'site-search':
      if (item.query === null) {
        return { title: i18n.t('palette.siteSearch.searchOn', [item.siteName]), action: 'search' };
      }
      if (item.query === '') return { title: item.siteName, subtitle: siteOf(item.url), action: 'open' };
      return {
        title: `“${item.query}”`,
        subtitle: i18n.t('palette.siteSearch.searchOn', [item.siteName]),
        action: 'search',
      };
  }
}

/** A site search waiting for its query: picking it turns the keyword into a chip. */
export const isPendingSiteSearch = (item: PaletteItem | undefined) =>
  item?.kind === 'site-search' && item.query === null;

/** Ctrl/⌘+Enter and Shift+Enter change where it opens. */
export const supportsDisposition = (item: PaletteItem) =>
  item.kind === 'page' ||
  item.kind === 'navigate' ||
  item.kind === 'search' ||
  (item.kind === 'site-search' && item.query !== null);

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
    copy: () => i18n.t('palette.actions.copy'),
  })[action]();

export const sectionLabel = (section: SectionId): string =>
  ({
    calculation: () => i18n.t('palette.sections.calculation'),
    go: () => i18n.t('palette.sections.go'),
    site: () => i18n.t('palette.sections.site'),
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
