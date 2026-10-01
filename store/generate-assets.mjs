/**
 * Generates the Chrome Web Store visuals, in French and English:
 *   store/<lang>/screenshot-{1..5}.png   1280×800
 *   store/<lang>/promo-small.png         440×280
 *   store/<lang>/promo-marquee.png       1400×560
 *
 *   npm run build && npm run store:assets
 *
 * The browser shows a fictional workspace (made-up sites and favicons, served
 * locally) so the screenshots look like real use without showing real brands.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const BUILD = path.join(ROOT, '.output/chrome-mv3');
const ICON = `data:image/png;base64,${readFileSync(path.join(ROOT, 'src/assets/icon.png')).toString('base64')}`;
const PORT = 4821;
const SIZE = { width: 1280, height: 800 };

/* ------------------------------------------------------------------------ */
/* Fictional workspace                                                       */
/* ------------------------------------------------------------------------ */

const SITES = {
  'stats.orbite.io': { color: '#6d5dfc', glyph: 'bars' },
  'studio.pixelia.io': { color: '#f2555a', glyph: 'circle' },
  'mail.coursier.io': { color: '#2f80ed', glyph: 'envelope' },
  'docs.nimbus.io': { color: '#14a37f', glyph: 'cloud' },
  'board.kanbo.io': { color: '#f2994a', glyph: 'columns' },
  'typo.atelier-lettres.fr': { color: '#1f2937', glyph: 'serif' },
  'notes.cahier.io': { color: '#e2b93b', glyph: 'lines' },
  'compta.ledgr.io': { color: '#0ea5a4', glyph: 'diamond' },
  'cuisine.marmite.fr': { color: '#d9468f', glyph: 'heart' },
  'drive.nuage.io': { color: '#3b82f6', glyph: 'triangle' },
};

const PAGES = {
  fr: [
    // [host, path, title, visits, open as tab]
    ['stats.orbite.io', '/q3', 'Tableau de bord Q3', 9, true],
    ['studio.pixelia.io', '/refonte', 'Refonte du site — Maquettes', 14, true],
    ['mail.coursier.io', '/inbox', 'Boîte de réception (3)', 22, true],
    ['docs.nimbus.io', '/api', 'Documentation API', 11, true],
    ['board.kanbo.io', '/sprint-42', 'Planning sprint 42', 7, true],
    ['typo.atelier-lettres.fr', '/guide', 'Guide typographique', 6, false],
    ['notes.cahier.io', '/lundi', 'Notes de réunion — lundi', 5, false],
    ['docs.nimbus.io', '/demarrage', 'Docs — Guide de démarrage', 4, false],
    ['drive.nuage.io', '/partages', 'Documents partagés', 3, false],
    ['compta.ledgr.io', '/factures/octobre', 'Facture fournisseur — octobre', 2, false],
    ['cuisine.marmite.fr', '/tarte-aux-pommes', 'Recette : tarte aux pommes', 1, false],
  ],
  en: [
    ['stats.orbite.io', '/q3', 'Q3 dashboard', 9, true],
    ['studio.pixelia.io', '/redesign', 'Website redesign — Mockups', 14, true],
    ['mail.coursier.io', '/inbox', 'Inbox (3)', 22, true],
    ['docs.nimbus.io', '/api', 'API documentation', 11, true],
    ['board.kanbo.io', '/sprint-42', 'Sprint 42 planning', 7, true],
    ['typo.atelier-lettres.fr', '/guide', 'Typography guide', 6, false],
    ['notes.cahier.io', '/monday', 'Monday meeting notes', 5, false],
    ['docs.nimbus.io', '/getting-started', 'Docs — Getting started', 4, false],
    ['drive.nuage.io', '/shared', 'Shared documents', 3, false],
    ['compta.ledgr.io', '/invoices/october', 'Supplier invoice — October', 2, false],
    ['cuisine.marmite.fr', '/apple-pie', 'Recipe: apple pie', 1, false],
  ],
};

const COPY = {
  fr: {
    tagline: 'Vos onglets, votre historique et le web, au bout du clavier.',
    marquee: ['Trouvez tout,', 'en deux touches.'],
    marqueeSub: 'Onglets, historique, favoris, commandes, recherche par site et calculs.',
    searches: { query: 'doc', site: 'ytb lofi', calc: '15% de 340 + 12*1.2' },
    dashboard: { revenue: "Chiffre d'affaires", users: 'Utilisateurs actifs', churn: 'Attrition', weekly: 'Activité hebdomadaire' },
  },
  en: {
    tagline: 'Your tabs, your history and the web, at your fingertips.',
    marquee: ['Find anything,', 'in two keystrokes.'],
    marqueeSub: 'Tabs, history, bookmarks, commands, site search and calculations.',
    searches: { query: 'doc', site: 'ytb lofi', calc: '15% of 340 + 12*1.2' },
    dashboard: { revenue: 'Revenue', users: 'Active users', churn: 'Churn', weekly: 'Weekly activity' },
  },
};

const GLYPHS = {
  bars: '<rect x="8" y="18" width="4" height="8" rx="1"/><rect x="14" y="12" width="4" height="14" rx="1"/><rect x="20" y="7" width="4" height="19" rx="1"/>',
  circle: '<circle cx="16" cy="16" r="7"/>',
  envelope: '<path d="M7 10h18v12H7z" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><path d="M7 10l9 7 9-7" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>',
  cloud: '<path d="M11 23a5 5 0 0 1-.6-10A7 7 0 0 1 24 14a4.5 4.5 0 0 1-1 9z"/>',
  columns: '<rect x="7" y="8" width="5" height="16" rx="1.5"/><rect x="14" y="8" width="5" height="11" rx="1.5"/><rect x="21" y="8" width="5" height="7" rx="1.5"/>',
  serif: '<text x="16" y="23" font-family="Georgia" font-size="19" font-weight="700" text-anchor="middle" fill="#fff">Aa</text>',
  lines: '<rect x="8" y="9" width="16" height="3" rx="1.5"/><rect x="8" y="15" width="16" height="3" rx="1.5"/><rect x="8" y="21" width="10" height="3" rx="1.5"/>',
  diamond: '<path d="M16 6l9 10-9 10-9-10z"/>',
  heart: '<path d="M16 25s-9-5.5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-9 11-9 11z"/>',
  triangle: '<path d="M16 7l10 17H6z"/>',
};

const favicon = (host) => {
  const site = SITES[host] ?? { color: '#888', glyph: 'circle' };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${site.color}"/><g fill="#fff">${GLYPHS[site.glyph]}</g></svg>`;
};

/** A plausible web app page: it sits blurred behind the palette. */
function pageHtml(host, title, lang) {
  const t = COPY[lang].dashboard;
  const color = SITES[host]?.color ?? '#6d5dfc';
  const bars = [42, 58, 51, 66, 72, 61, 80, 77, 88, 70, 92, 85]
    .map((h) => `<div style="flex:1;height:${h}%;background:${color};opacity:.85;border-radius:6px 6px 0 0"></div>`)
    .join('');
  const card = (label, value, delta) =>
    `<div style="background:#fff;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px #0000000d">
      <div style="font-size:13px;color:#6b7280">${label}</div>
      <div style="font-size:28px;font-weight:700;margin-top:6px">${value}</div>
      <div style="font-size:12px;color:#16a34a;margin-top:4px">${delta}</div></div>`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${title}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml"></head>
  <body style="margin:0;font-family:system-ui,'Segoe UI',sans-serif;background:#f3f4f6;color:#111827;display:flex;height:100vh">
    <aside style="width:230px;background:#111827;color:#9ca3af;padding:22px 16px;box-sizing:border-box">
      <div style="display:flex;align-items:center;gap:10px;color:#fff;font-weight:700;font-size:16px;margin-bottom:28px">
        <span style="width:26px;height:26px;border-radius:7px;background:${color}"></span>${host.split('.')[1]}</div>
      ${['Overview', 'Reports', 'Customers', 'Billing', 'Settings']
        .map((item, i) => `<div style="padding:10px 12px;border-radius:8px;margin-bottom:4px;${i === 0 ? 'background:#1f2937;color:#fff' : ''}">${item}</div>`)
        .join('')}
    </aside>
    <main style="flex:1;padding:32px 40px;box-sizing:border-box">
      <h1 style="margin:0 0 24px;font-size:26px">${title}</h1>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px">
        ${card(t.revenue, '128 400 €', '+12,4 %')}${card(t.users, '8 912', '+5,1 %')}${card(t.churn, '2,3 %', '−0,4 pt')}
      </div>
      <div style="background:#fff;border-radius:14px;padding:22px;margin-top:18px;box-shadow:0 1px 2px #0000000d">
        <div style="font-size:14px;font-weight:600;margin-bottom:16px">${t.weekly}</div>
        <div style="display:flex;align-items:flex-end;gap:12px;height:260px">${bars}</div>
      </div>
    </main>
  </body></html>`;
}

/* ------------------------------------------------------------------------ */
/* Browser with the extension                                                */
/* ------------------------------------------------------------------------ */

async function withBrowser(lang, colorScheme, run) {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'hopp-store-'));
  const extension = path.join(temp, 'extension');
  cpSync(BUILD, extension, { recursive: true });
  // Host permissions so the script can inject the overlay without a real shortcut press.
  const manifestPath = path.join(extension, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, host_permissions: ['<all_urls>'] }));

  const hosts = Object.keys(SITES).map((host) => `MAP ${host} 127.0.0.1:${PORT}`).join(', ');
  const context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
    channel: 'chromium',
    headless: true,
    locale: lang === 'fr' ? 'fr-FR' : 'en-US',
    colorScheme,
    viewport: SIZE,
    deviceScaleFactor: 2,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      `--host-resolver-rules=${hosts}`,
      `--lang=${lang === 'fr' ? 'fr-FR' : 'en-US'}`,
    ],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await new Promise((resolve) => setTimeout(resolve, 600));
    for (const page of context.pages()) if (page.url().includes('options.html')) await page.close();
    await run({ context, worker, extensionId: new URL(worker.url()).host });
  } finally {
    await context.close();
    rmSync(temp, { recursive: true, force: true });
  }
}

/** Visits, tabs, a bookmark, and the dashboard tab focused last. */
async function setUpWorkspace(context, worker, lang) {
  const pages = PAGES[lang];
  const scratch = context.pages()[0] ?? (await context.newPage());
  // Interleaved, so each visit is a navigation rather than a reload.
  const rounds = Math.max(...pages.map(([, , , visits]) => visits));
  for (let round = 0; round < rounds; round++) {
    for (const [host, pathname, , visits] of pages) {
      if (visits > round) await scratch.goto(`http://${host}${pathname}`);
    }
  }
  // Best effort: the real favicon for the YouTube site search screenshot.
  await scratch.goto('https://www.youtube.com/', { timeout: 15_000 }).catch(() => {});
  await scratch.waitForTimeout(1500);

  const tabs = {};
  for (const [host, pathname, title, , open] of [...pages].reverse()) {
    if (!open) continue;
    const page = await context.newPage();
    await page.goto(`http://${host}${pathname}`);
    tabs[title] = page;
  }
  await scratch.close();
  await worker.evaluate(
    (bookmark) => chrome.bookmarks.create({ title: bookmark[2], url: `http://${bookmark[0]}${bookmark[1]}` }),
    pages[5],
  );
  // Focus order drives "Open tabs": mail, mockups, docs… then the dashboard.
  for (const index of [4, 3, 1, 2]) {
    await tabs[pages[index][2]].bringToFront();
    await tabs[pages[index][2]].waitForTimeout(120);
  }
  const dashboard = tabs[pages[0][2]];
  await dashboard.bringToFront();
  // Let Chrome store the favicons.
  await dashboard.waitForTimeout(1500);
  return dashboard;
}

async function openPalette(page, worker) {
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    try {
      if ((await chrome.tabs.sendMessage(tab.id, { hop: 'toggle' }, { frameId: 0 })) === true) return;
    } catch {}
    // The workspace was visited seconds ago: show the palette "a day later",
    // so visits read "Yesterday" rather than "Just now" everywhere.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const now = Date.now.bind(Date);
        Date.now = () => now() + 26 * 3_600_000;
      },
    });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['/content-scripts/overlay.js'] });
  });
  await page.waitForSelector('hop-palette', { state: 'attached' });
  await page.waitForTimeout(600);
}

async function closePalette(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

const shot = (page, file) => page.screenshot({ path: file, scale: 'css' });

/* ------------------------------------------------------------------------ */
/* Promotional tiles                                                         */
/* ------------------------------------------------------------------------ */

async function renderTile(context, file, width, height, html) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html><body style="margin:0">${html}</body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: file, scale: 'css' });
  await page.close();
}

const TILE_BACKGROUND = 'radial-gradient(120% 140% at 0% 0%, #3a2420 0%, #1b1b1b 55%, #141414 100%)';

function smallTile(lang) {
  return `<div style="width:440px;height:280px;background:${TILE_BACKGROUND};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,'Segoe UI',sans-serif;color:#fff;gap:14px">
    <img src="${ICON}" style="width:96px;height:96px;filter:drop-shadow(0 10px 24px #f2555a55)">
    <div style="font-size:40px;font-weight:700;letter-spacing:-0.02em">Hopp</div>
    <div style="font-size:15px;color:#c9c9c6;max-width:360px;text-align:center;line-height:1.35;text-wrap:balance">${COPY[lang].tagline}</div>
  </div>`;
}

function marquee(lang, screenshot) {
  const [first, second] = COPY[lang].marquee;
  return `<div style="width:1400px;height:560px;background:${TILE_BACKGROUND};display:flex;align-items:center;font-family:system-ui,'Segoe UI',sans-serif;color:#fff;overflow:hidden">
    <div style="padding-left:90px;width:520px;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:34px">
        <img src="${ICON}" style="width:64px;height:64px"><span style="font-size:34px;font-weight:700">Hopp</span>
      </div>
      <div style="font-size:52px;font-weight:700;line-height:1.08;letter-spacing:-0.025em">${first}<br><span style="color:#ff8a5c">${second}</span></div>
      <div style="font-size:18px;color:#c9c9c6;margin-top:22px;line-height:1.4">${COPY[lang].marqueeSub}</div>
    </div>
    <div style="width:640px;height:514px;margin-left:120px;flex-shrink:0;border-radius:14px;overflow:hidden;box-shadow:0 30px 80px #000c">
      <img src="${screenshot}" style="width:1280px;height:800px;margin:-112px 0 0 -320px">
    </div>
  </div>`;
}

/* ------------------------------------------------------------------------ */
/* Main                                                                      */
/* ------------------------------------------------------------------------ */

const server = http.createServer((req, res) => {
  const host = req.headers.host.split(':')[0];
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/favicon.svg' || url.pathname === '/favicon.ico') {
    res.setHeader('content-type', 'image/svg+xml');
    return res.end(favicon(host));
  }
  const lang = url.searchParams.get('lang') ?? currentLang;
  const page = PAGES[lang].find(([h, p]) => h === host && p === url.pathname);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(pageHtml(host, page?.[2] ?? host, lang));
});
let currentLang = 'fr';
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

try {
  for (const lang of ['fr', 'en']) {
    currentLang = lang;
    const out = path.join(ROOT, 'store', lang);
    mkdirSync(out, { recursive: true });
    const { searches } = COPY[lang];

    await withBrowser(lang, 'dark', async ({ context, worker, extensionId }) => {
      const page = await setUpWorkspace(context, worker, lang);

      // 1. Smart suggestions, dark.
      await openPalette(page, worker);
      await shot(page, path.join(out, 'screenshot-1.png'));
      await closePalette(page);

      // 3. Site search.
      await openPalette(page, worker);
      await page.keyboard.type(searches.site);
      await page.waitForTimeout(400);
      await shot(page, path.join(out, 'screenshot-3.png'));
      await closePalette(page);

      // 5. Settings.
      const options = await context.newPage();
      await options.goto(`chrome-extension://${extensionId}/options.html`);
      await options.waitForTimeout(700);
      await shot(options, path.join(out, 'screenshot-5.png'));
      await options.close();

      // Marquee: built from the dark suggestions screenshot.
      const screenshot = `data:image/png;base64,${readFileSync(path.join(out, 'screenshot-1.png')).toString('base64')}`;
      await renderTile(context, path.join(out, 'promo-marquee.png'), 1400, 560, marquee(lang, screenshot));
      await renderTile(context, path.join(out, 'promo-small.png'), 440, 280, smallTile(lang));
    });

    await withBrowser(lang, 'light', async ({ context, worker }) => {
      const page = await setUpWorkspace(context, worker, lang);

      // 2. Fuzzy search across tabs and history, light.
      await openPalette(page, worker);
      await page.keyboard.type(searches.query);
      await page.waitForTimeout(500);
      await shot(page, path.join(out, 'screenshot-2.png'));
      await closePalette(page);

      // 4. Calculator.
      await openPalette(page, worker);
      await page.keyboard.type(searches.calc);
      await page.waitForTimeout(400);
      await shot(page, path.join(out, 'screenshot-4.png'));
    });
    console.log(`✔ ${lang}: ${path.relative(ROOT, out)}`);
  }
} finally {
  server.close();
}
