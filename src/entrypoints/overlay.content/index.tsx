/**
 * In-page palette. Not declared in the manifest: the background injects it
 * on demand (first shortcut press in a tab), so pages that never use Hop pay
 * nothing. It opens itself when injected, then toggles on messages.
 */
import { createRoot, type Root } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { createShadowRootUi, type ShadowRootContentScriptUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { isPaletteMessage } from '@/shared/messaging';
import { preloadSettings } from '@/ui/hooks/use-settings';
import { createOverlayController } from '@/ui/palette/overlay-controller';
import { Overlay } from '@/ui/palette/overlay';
import css from '@/ui/styles.css?inline';

export default defineContentScript({
  registration: 'runtime',
  cssInjectionMode: 'manual',

  async main(ctx) {
    let ui: ShadowRootContentScriptUi<Root> | undefined;
    // The full-screen container must not swallow clicks while closed. Styled
    // from inside the shadow root: WXT's `:host { all: initial !important }`
    // reset overrides any inline style set on the host element itself.
    const setVisible = (visible: boolean) => {
      if (ui) ui.uiContainer.style.display = visible ? '' : 'none';
    };
    const controller = createOverlayController(setVisible);
    // Opened (and recording keystrokes) right away, before the async setup
    // below. Keys typed while the page parses this script are queued by the
    // browser, so they reach the buffer too.
    controller.open();

    // Registered first: a toggle may arrive while the UI is being created.
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isPaletteMessage(message) || ctx.isInvalid) return;
      controller.toggle();
      sendResponse(true);
    });

    // Avoids a flash of the default theme on first open.
    await preloadSettings().catch(() => {});

    ui = await createShadowRootUi(ctx, {
      name: 'hop-palette',
      position: 'modal',
      css,
      // Keep the page's own shortcuts (YouTube, GitHub…) from reacting to our typing.
      isolateEvents: ['keydown', 'keyup', 'keypress', 'input'],
      onMount(container, shadow) {
        // The host has no stacking context (reset), so the fixed container competes with the page directly.
        container.style.zIndex = '2147483647';
        const root = createRoot(container);
        root.render(<Overlay controller={controller} domRoot={shadow} />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount();
    setVisible(controller.getSnapshot().phase !== 'closed');
  },
});
