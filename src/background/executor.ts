/** Performs what the user picked in the palette. */
import { browser } from 'wxt/browser';
import { usageKey } from '@/core/corpus';
import type { PageItem, TabItem } from '@/core/items';
import { BROWSER } from '@/shared/env';
import type { Disposition, ExecuteRequest, ExecuteResult } from '@/shared/messaging';
import { buildSearchUrl } from '@/shared/search-engines';
import { getSettings, type Settings } from '@/shared/settings';
import { runCommand } from './commands';
import { getActiveContext, isEmptyTab, type ActiveContext } from './context';
import { forgetUsage, recordUsage } from './usage-store';

type Target = 'new-tab' | 'current-tab' | 'new-window';

function resolveTarget(disposition: Disposition, settings: Settings, ctx: ActiveContext): Target {
  if (disposition === 'new-window') return 'new-window';
  const preferred = settings.openIn;
  const target = disposition === 'alternate' ? (preferred === 'new-tab' ? 'current-tab' : 'new-tab') : preferred;
  // Reuse an empty "new tab" page instead of stacking another one.
  if (target === 'new-tab' && ctx.tab?.id != null && isEmptyTab(ctx.tab.url)) return 'current-tab';
  return target;
}

async function openUrl(url: string, target: Target, ctx: ActiveContext): Promise<void> {
  if (target === 'new-window') {
    await browser.windows.create({ url });
  } else if (target === 'current-tab' && ctx.tab?.id != null) {
    await browser.tabs.update(ctx.tab.id, { url });
  } else {
    // Next to the current tab, like a link opened from it.
    await browser.tabs.create({ url, windowId: ctx.windowId, index: ctx.tab ? ctx.tab.index + 1 : undefined });
  }
}

async function webSearch(query: string, target: Target, ctx: ActiveContext, settings: Settings): Promise<void> {
  const url = buildSearchUrl(settings.searchEngine, settings.customSearchUrl, query);
  if (url) return openUrl(url, target, ctx);

  // The browser's default engine.
  if (target === 'current-tab' && ctx.tab?.id != null) {
    await browser.search.query({ text: query, tabId: ctx.tab.id });
  } else {
    await browser.search.query({ text: query, disposition: target === 'new-window' ? 'NEW_WINDOW' : 'NEW_TAB' });
  }
}

async function focusTab(tab: TabItem): Promise<void> {
  await browser.tabs.update(tab.tabId, { active: true });
  await browser.windows.update(tab.windowId, { focused: true });
}

export async function execute({ item, disposition, query }: ExecuteRequest): Promise<ExecuteResult> {
  const [ctx, settings] = await Promise.all([getActiveContext(), getSettings()]);
  let result: ExecuteResult = {};

  switch (item.kind) {
    case 'tab':
      await focusTab(item);
      break;
    case 'page':
    case 'navigate':
      await openUrl(item.url, resolveTarget(disposition, settings, ctx), ctx);
      break;
    case 'search':
      await webSearch(item.query, resolveTarget(disposition, settings, ctx), ctx, settings);
      break;
    case 'command':
      result = await runCommand(item.commandId, { ...ctx, browser: BROWSER });
      break;
  }

  const key = usageKey(item);
  if (key) void recordUsage(key, query);
  return result;
}

export async function dismiss(item: TabItem | PageItem): Promise<void> {
  if (item.kind === 'tab') {
    await browser.tabs.remove(item.tabId);
    return;
  }
  if (item.inHistory) await browser.history.deleteUrl({ url: item.url });
  const key = usageKey(item);
  if (key) await forgetUsage(key);
}
