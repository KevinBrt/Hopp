/** URL helpers shared by the background and the UI. Pure functions only. */

const BLANK_TAB_URLS = new Set([
  'about:blank',
  'about:home',
  'about:newtab',
  'about:privatebrowsing',
  'chrome://newtab/',
  'chrome://new-tab-page/',
  'edge://newtab/',
]);

/** Pages where extensions cannot inject scripts. */
const RESTRICTED_PREFIXES = [
  'about:',
  'brave://',
  'chrome-extension://',
  'chrome-search://',
  'chrome://',
  'devtools://',
  'edge://',
  'moz-extension://',
  'opera://',
  'resource://',
  'view-source:',
  'vivaldi://',
  'https://chrome.google.com/webstore',
  'https://chromewebstore.google.com',
  'https://microsoftedge.microsoft.com/addons',
  'https://addons.mozilla.org',
];

/** Schemes we never list nor open (bookmarklets, inline data…). */
const IGNORED_SCHEMES = ['javascript:', 'data:', 'blob:', 'place:'];

function tryParse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Canonical key used to deduplicate the same page across sources: ignores
 * the scheme (http/https), `www.`, the hash and a trailing slash.
 */
export function normalizeUrl(url: string): string {
  const parsed = tryParse(url);
  if (!parsed || !/^https?:$/.test(parsed.protocol)) return url.replace(/#.*$/, '');
  const host = parsed.host.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname.replace(/\/+$/, '');
  return `${host}${path}${parsed.search}`;
}

/** Host without `www.`, or the URL itself for non-web schemes. */
export function hostname(url: string): string {
  const parsed = tryParse(url);
  if (!parsed) return url;
  if (!parsed.host) return `${parsed.protocol}${parsed.pathname}`;
  return parsed.host.replace(/^www\./, '');
}

/** Human readable URL: no scheme, no `www.`, no trailing slash. */
export function displayUrl(url: string): string {
  const parsed = tryParse(url);
  if (!parsed || !parsed.host) return url;
  const path = decodeSafe(parsed.pathname).replace(/\/+$/, '');
  return `${parsed.host.replace(/^www\./, '')}${path}`;
}

function decodeSafe(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

export function isBlankTabUrl(url: string | undefined): boolean {
  return !url || BLANK_TAB_URLS.has(url);
}

export function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  return RESTRICTED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function isListableUrl(url: string | undefined): url is string {
  return !!url && !IGNORED_SCHEMES.some((scheme) => url.startsWith(scheme));
}

const SCHEME_RE = /^[a-z][a-z\d+.-]*:\/\//i;
// Unicode property escapes rather than a `¡-￿` range: minifiers
// inline the latter as a raw U+FFFF, which Chrome rejects in content scripts.
const HOST_RE = /^(localhost|\d{1,3}(\.\d{1,3}){3}|([\p{L}\p{N}]([\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+\p{L}{2,})(:\d{1,5})?$/iu;

/**
 * If the input looks like something the user wants to navigate to
 * ("github.com", "localhost:3000/api", "https://…"), returns the URL to open.
 */
export function parseNavigableInput(input: string): string | null {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;

  if (SCHEME_RE.test(text) || /^(about|chrome|edge|file):/i.test(text)) {
    return tryParse(text) ? text : null;
  }

  const [host = ''] = text.split(/[/?#]/, 1);
  if (!HOST_RE.test(host)) return null;

  const scheme = /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/i.test(host) ? 'http' : 'https';
  const url = `${scheme}://${text}`;
  return tryParse(url) ? url : null;
}
