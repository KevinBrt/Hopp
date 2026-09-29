import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { preloadSettings } from '@/ui/hooks/use-settings';
import { StandalonePalette, type StandaloneMode } from '@/ui/palette/standalone';
import '@/ui/styles.css';

const mode: StandaloneMode = new URLSearchParams(location.search).get('mode') === 'window' ? 'window' : 'popup';
document.documentElement.dataset.mode = mode;
document.documentElement.lang = browser.i18n.getUILanguage();

// Settings first, so the palette never renders with the wrong theme.
void preloadSettings()
  .catch(() => {})
  .then(() => createRoot(document.getElementById('root')!).render(<StandalonePalette mode={mode} />));
