/**
 * Memoizes an async loader for `ttl` ms. We deliberately avoid invalidating
 * through browser events (history.onVisited…): listening to them would wake
 * the service worker on every page load.
 */
export function cached<T>(load: () => Promise<T>, ttl: number): () => Promise<T> {
  let value: Promise<T> | null = null;
  let expiresAt = 0;
  return () => {
    const now = Date.now();
    if (!value || now > expiresAt) {
      expiresAt = now + ttl;
      value = load().catch((error: unknown) => {
        value = null;
        throw error;
      });
    }
    return value;
  };
}
