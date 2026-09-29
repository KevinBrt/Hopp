import { i18n } from '#i18n';
import { browser } from 'wxt/browser';

const locale = browser.i18n.getUILanguage();
const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'long' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "Just now", "Yesterday", "3 days ago", "Hier", "Il y a 3 jours"… */
export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const elapsed = timestamp - now;
  if (Math.abs(elapsed) < 60_000) return i18n.t('palette.justNow');
  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms || unit === 'minute') {
      const text = relative.format(Math.round(elapsed / ms), unit);
      return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
    }
  }
  return '';
}
