/**
 * Records what the user types between the shortcut and the moment the
 * palette input has the focus (script injection, first render…), so fast
 * typists never lose their first letters. The keys are also kept from the
 * page, which would otherwise react to them (YouTube's "k", GitHub's "s"…).
 */
export interface KeyBuffer {
  /** Stops recording and returns the typed text. */
  take(): string;
}

export function createKeyBuffer(initial = ''): KeyBuffer {
  let text = initial;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length === 1) text += event.key;
    else if (event.key === 'Backspace') text = text.slice(0, -1);
    else return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  // Capture phase on the window: runs before the page's own handlers.
  window.addEventListener('keydown', onKeyDown, true);
  return {
    take() {
      window.removeEventListener('keydown', onKeyDown, true);
      const typed = text;
      text = '';
      return typed;
    },
  };
}
