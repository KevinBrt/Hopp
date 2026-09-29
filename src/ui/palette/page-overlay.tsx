/**
 * The overlay inside Hop's own pages (options, new tab). Browsers forbid
 * injecting content scripts into extension pages, so they host the overlay
 * themselves and it opens centered like on any website.
 */
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { isPaletteMessage } from '@/shared/messaging';
import { createOverlayController, type OverlayController } from './overlay-controller';
import { Overlay } from './overlay';

export async function installPageOverlay(): Promise<OverlayController> {
  const container = document.createElement('div');
  container.style.display = 'none';
  document.body.append(container);

  const controller = createOverlayController((visible) => {
    container.style.display = visible ? '' : 'none';
  });
  createRoot(container).render(<Overlay controller={controller} domRoot={document.body} />);

  const tab = await browser.tabs.getCurrent();
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isPaletteMessage(message) || message.tabId == null || message.tabId !== tab?.id) return;
    controller.toggle();
    sendResponse(true);
  });
  return controller;
}
