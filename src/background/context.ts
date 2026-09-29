import { browser, type Browser } from 'wxt/browser';
import { isBlankTabUrl } from '@/core/url';

/** Origin of Hop's own pages (chrome-extension://<id>, moz-extension://<uuid>). */
export const OWN_ORIGIN = self.location.origin;

export const isOwnPage = (url: string | undefined) => !!url?.startsWith(OWN_ORIGIN);

/** Hop replaces the browser's new tab page. */
export const isOwnNewTab = (url: string | undefined) => !!url?.startsWith(`${OWN_ORIGIN}/newtab.html`);

/** A tab showing nothing: navigating it is better than opening another one. */
export const isEmptyTab = (url: string | undefined) => isBlankTabUrl(url) || isOwnNewTab(url);

/** The standalone palette (popup or window) is never a result. */
export const isPalettePage = (url: string | undefined) => !!url?.startsWith(`${OWN_ORIGIN}/palette.html`);

export interface ActiveContext {
  /** The active tab of the last focused *normal* window (never our own popup). */
  tab?: Browser.tabs.Tab;
  windowId?: number;
}

export async function getActiveContext(): Promise<ActiveContext> {
  try {
    const window = await browser.windows.getLastFocused({ windowTypes: ['normal'] });
    const [tab] = await browser.tabs.query({ active: true, windowId: window.id });
    return { tab, windowId: window.id };
  } catch {
    // No normal window (e.g. all closed): nothing to act on.
    return {};
  }
}
