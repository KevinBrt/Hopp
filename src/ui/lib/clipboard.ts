/**
 * Copies text from a content script or an extension page. The async
 * Clipboard API needs a secure, focused document; the legacy path covers
 * plain http pages.
 */
export async function copyText(text: string, root: Node = document.body): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    root.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  }
}
