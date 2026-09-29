import { i18n } from '#i18n';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { preloadSettings } from '@/ui/hooks/use-settings';
import { OptionsApp } from '@/ui/options/options-app';
import { installPageOverlay } from '@/ui/palette/page-overlay';
import '@/ui/styles.css';

document.title = i18n.t('options.title');
document.documentElement.lang = browser.i18n.getUILanguage();

// Settings first, so the page never renders with the wrong theme.
void preloadSettings()
  .catch(() => {})
  .then(() => {
    createRoot(document.getElementById('root')!).render(<OptionsApp />);
    void installPageOverlay();
  });
