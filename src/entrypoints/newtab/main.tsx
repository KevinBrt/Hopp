/**
 * Hop's new tab page: the palette, open and centered, Arc-style. Replacing
 * the browser's page is the only way to show it there, since extensions
 * cannot draw over the built-in new tab.
 */
import { i18n } from '#i18n';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { preloadSettings } from '@/ui/hooks/use-settings';
import { NewTabPage } from '@/ui/newtab/new-tab-page';
import { installPageOverlay } from '@/ui/palette/page-overlay';
import '@/ui/styles.css';

const FOCUS_FLAG = 'focus';

// Browsers give the address bar the focus on new tab pages, so typing would
// go there. Navigating the page once hands the focus back to its content.
if (!new URLSearchParams(location.search).has(FOCUS_FLAG)) {
  location.replace(`?${FOCUS_FLAG}`);
} else {
  document.title = i18n.t('newtab.title');
  document.documentElement.lang = browser.i18n.getUILanguage();

  void preloadSettings()
    .catch(() => {})
    .then(async () => {
      const controller = await installPageOverlay();
      createRoot(document.getElementById('root')!).render(<NewTabPage controller={controller} />);
      controller.open();
    });
}
