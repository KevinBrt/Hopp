export type BrowserName = 'chrome' | 'firefox';

export const BROWSER: BrowserName = import.meta.env.FIREFOX ? 'firefox' : 'chrome';
