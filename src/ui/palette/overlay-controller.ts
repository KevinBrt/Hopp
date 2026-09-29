/**
 * Open/close state machine of the in-page overlay, as a tiny external store:
 * closed → open → closing (exit animation) → closed.
 */
export type OverlayPhase = 'closed' | 'open' | 'closing';

export interface OverlaySnapshot {
  phase: OverlayPhase;
  /** Incremented on every opening: remounts the palette with a fresh state. */
  session: number;
}

export interface OverlayController {
  subscribe(listener: () => void): () => void;
  getSnapshot(): OverlaySnapshot;
  open(): void;
  close(): void;
  toggle(): void;
  /** Called when the exit animation ends. */
  finishClose(): void;
}

/** Hidden tabs pause animations: never wait for `animationend` longer than this. */
const CLOSE_FALLBACK = 250;

export function createOverlayController(onVisibilityChange: (visible: boolean) => void): OverlayController {
  let snapshot: OverlaySnapshot = { phase: 'closed', session: 0 };
  let previousFocus: HTMLElement | null = null;
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  const set = (next: OverlaySnapshot) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  const controller: OverlayController = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    open() {
      if (snapshot.phase === 'open') return;
      clearTimeout(fallbackTimer);
      if (snapshot.phase === 'closed') {
        previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      onVisibilityChange(true);
      set({ phase: 'open', session: snapshot.session + 1 });
    },
    close() {
      if (snapshot.phase !== 'open') return;
      set({ ...snapshot, phase: 'closing' });
      fallbackTimer = setTimeout(controller.finishClose, CLOSE_FALLBACK);
    },
    toggle() {
      if (snapshot.phase === 'open') controller.close();
      else controller.open();
    },
    finishClose() {
      if (snapshot.phase !== 'closing') return;
      clearTimeout(fallbackTimer);
      set({ ...snapshot, phase: 'closed' });
      onVisibilityChange(false);
      // Give the focus back to where the user was typing, if still possible.
      if (previousFocus?.isConnected && document.hasFocus()) previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    },
  };
  return controller;
}
