/**
 * Opens (or closes) the palette. Preferred path: the overlay injected into
 * the current page, centered over it. Hop's own pages host the overlay
 * themselves. Browser pages (new tab, settings…) and web stores forbid
 * injection, so there we fall back to the toolbar popup, then to a small
 * centered window.
 */
import { browser, type Browser } from 'wxt/browser';
import { isRestrictedUrl } from '@/core/url';
import type { PaletteMessage } from '@/shared/messaging';
import { getActiveContext, isEmptyTab, isOwnPage } from './context';
import { warmCorpus } from './corpus';

const OVERLAY_SCRIPT = '/content-scripts/overlay.js';
const PALETTE_PAGE = '/palette.html';
const WINDOW_SIZE = { width: 680, height: 500 };

export async function togglePalette(tab?: Browser.tabs.Tab): Promise<void> {
  warmCorpus();
  if (await closeStandaloneWindows()) return;

  const target = tab ?? (await getActiveContext()).tab;
  // Hop's new tab may still report chrome://newtab/ while loading.
  if (target?.id != null && (isOwnPage(target.url) || isEmptyTab(target.url))) {
    if (await toggleExtensionPage(target.id)) return;
  } else if (target?.id != null && !isRestrictedUrl(target.url)) {
    if (await toggleOverlay(target.id)) return;
    if (await injectOverlay(target.id)) return;
  }
  if (await openActionPopup()) return;
  await openCenteredWindow();
}

/** Succeeds when the overlay script is already running in the page. */
async function toggleOverlay(tabId: number): Promise<boolean> {
  try {
    const message: PaletteMessage = { hop: 'toggle' };
    return (await browser.tabs.sendMessage(tabId, message, { frameId: 0 })) === true;
  } catch {
    return false;
  }
}

/** Hop's own pages listen to runtime messages (see ui/palette/page-overlay.tsx). */
async function toggleExtensionPage(tabId: number): Promise<boolean> {
  try {
    const message: PaletteMessage = { hop: 'toggle', tabId };
    return (await browser.runtime.sendMessage(message)) === true;
  } catch {
    return false;
  }
}

/** The script opens the palette by itself once injected. */
async function injectOverlay(tabId: number): Promise<boolean> {
  try {
    await browser.scripting.executeScript({ target: { tabId }, files: [OVERLAY_SCRIPT] });
    return true;
  } catch {
    return false;
  }
}

async function openActionPopup(): Promise<boolean> {
  // MV3 exposes `action`, Firefox's MV2 build `browserAction`.
  const action = browser.action ?? browser.browserAction;
  if (!action?.openPopup) return false;
  try {
    await action.setPopup({ popup: PALETTE_PAGE });
    await action.openPopup();
    return true;
  } catch {
    return false;
  } finally {
    // Keep toolbar clicks going through `onClicked` (in-page overlay).
    await action.setPopup({ popup: '' }).catch(() => {});
  }
}

async function openCenteredWindow(): Promise<void> {
  const { width, height } = WINDOW_SIZE;
  const parent = await browser.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
  const left = parent?.left != null && parent.width ? Math.round(parent.left + (parent.width - width) / 2) : undefined;
  const top = parent?.top != null && parent.height ? Math.round(parent.top + parent.height * 0.15) : undefined;
  await browser.windows.create({
    url: browser.runtime.getURL(`${PALETTE_PAGE}?mode=window`),
    type: 'popup',
    focused: true,
    width,
    height,
    left,
    top,
  });
}

/** Pressing the shortcut again while the standalone window is open closes it. */
async function closeStandaloneWindows(): Promise<boolean> {
  const tabs = await browser.tabs.query({ url: browser.runtime.getURL(`${PALETTE_PAGE}*`) }).catch(() => []);
  const windowIds = [...new Set(tabs.map((tab) => tab.windowId))];
  await Promise.allSettled(windowIds.map((id) => browser.windows.remove(id)));
  return windowIds.length > 0;
}
