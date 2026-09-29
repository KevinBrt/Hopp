/**
 * Hop's new tab page. Replacing the browser's page is the only way to show
 * the palette there (extensions cannot draw over the built-in new tab), and
 * a manifest override cannot be toggled, so the page itself honours the
 * `newTabPalette` setting:
 * - on: the palette, open and centered, Arc-style;
 * - off: Chrome's own new tab page. Firefox forbids opening its page, so
 *   there it stays a calm Hop page with the palette one key away.
 */
import { i18n } from '#i18n';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { BROWSER } from '@/shared/env';
import { preloadSettings } from '@/ui/hooks/use-settings';
import { NewTabPage } from '@/ui/newtab/new-tab-page';
import { installPageOverlay } from '@/ui/palette/page-overlay';
import '@/ui/styles.css';

/** Chrome's built-in page; `chrome://newtab` would come back here. */
const CHROME_NEW_TAB = 'chrome://new-tab-page';
const FOCUS_FLAG = 'focus';

async function render(openPalette: boolean) {
  document.title = i18n.t('newtab.title');
  document.documentElement.lang = browser.i18n.getUILanguage();
  const controller = await installPageOverlay();
  createRoot(document.getElementById('root')!).render(<NewTabPage controller={controller} />);
  if (openPalette) controller.open();
}

async function start() {
  const { newTabPalette } = await preloadSettings().catch(() => ({ newTabPalette: false }));

  if (!newTabPalette) {
    if (BROWSER === 'chrome') {
      await browser.tabs.update({ url: CHROME_NEW_TAB });
      return;
    }
    return render(false);
  }

  // Browsers give the address bar the focus on new tab pages, so typing would
  // go there. Navigating the page once hands the focus back to its content.
  if (!new URLSearchParams(location.search).has(FOCUS_FLAG)) {
    location.replace(`?${FOCUS_FLAG}`);
    return;
  }
  return render(true);
}

void start();
