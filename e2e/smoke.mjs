/**
 * End-to-end smoke test: loads the production Chrome build in Playwright's
 * Chromium, opens the in-page palette on local pages and checks the
 * essentials (focus, search, scopes, tab switch, learning, click-through).
 *
 *   npm run build && npm run test:e2e        # screenshots in e2e/.screenshots
 *   npm run test:e2e -- --theme=light
 *
 * First run: `npx playwright install chromium`.
 */
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const BUILD = path.join(ROOT, '.output/chrome-mv3');
const SHOTS = path.join(ROOT, 'e2e/.screenshots');
const theme = process.argv.find((arg) => arg.startsWith('--theme='))?.split('=')[1] ?? 'dark';
const PORT = 4817;

const PAGES = {
  refonte: 'Refonte du site',
  inbox: 'Boîte de réception',
  docs: 'Documentation API',
  dashboard: 'Tableau de bord Q3',
  typo: 'Guide typographique',
};

// A copy of the build with host permissions: tests cannot press the real
// shortcut, so they inject the overlay without the activeTab grant.
const temp = mkdtempSync(path.join(os.tmpdir(), 'hop-e2e-'));
const extension = path.join(temp, 'extension');
cpSync(BUILD, extension, { recursive: true });
const manifestPath = path.join(extension, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
writeFileSync(manifestPath, JSON.stringify({ ...manifest, host_permissions: ['<all_urls>'] }));
mkdirSync(SHOTS, { recursive: true });

// Pages set `html { font-size: 62.5% }` to check the palette ignores it.
const server = http.createServer((req, res) => {
  const title = PAGES[req.url.slice(1)] ?? 'Page';
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html style="font-size:62.5%"><head><title>${title}</title></head>
    <body style="margin:0;font-family:Georgia;background:linear-gradient(120deg,#e8e4dc,#cfd8e3)">
    <main style="padding:40px"><h1 style="font-size:4rem">${title}</h1>
    ${'<p style="font-size:1.6rem;max-width:700px">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>'.repeat(8)}
    </main></body></html>`);
});
await new Promise((resolve) => server.listen(PORT, resolve));
const url = (key) => `http://localhost:${PORT}/${key}`;

const context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
  channel: 'chromium',
  headless: true,
  colorScheme: theme,
  viewport: { width: 1100, height: 720 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
const errors = [];
context.on('weberror', (error) => errors.push(String(error.error())));

try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const extensionId = new URL(worker.url()).host;

  // History, tabs and a bookmark. The options page opens on install: close it.
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const page of context.pages()) if (page.url().includes('options.html')) await page.close();
  const first = context.pages()[0] ?? (await context.newPage());
  await first.goto(url('typo'));
  const tabs = {};
  for (const key of ['refonte', 'inbox', 'docs', 'dashboard']) {
    tabs[key] = key === 'refonte' ? first : await context.newPage();
    tabs[key].on('console', (message) => message.type() === 'error' && errors.push(`[${key}] ${message.text()}`));
    await tabs[key].goto(url(key));
  }
  await worker.evaluate(() => chrome.bookmarks.create({ title: 'Guide typographique', url: 'http://localhost:4817/typo' }));

  const page = tabs.dashboard;
  await page.bringToFront();
  const shadow = (fn) => page.evaluate(fn);

  // Same logic as the launcher: toggle if present, inject otherwise.
  async function openPalette() {
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      try {
        if ((await chrome.tabs.sendMessage(tab.id, { hop: 'toggle' }, { frameId: 0 })) === true) return;
      } catch {}
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['/content-scripts/overlay.js'] });
    });
    await page.waitForSelector('hop-palette', { state: 'attached' });
    await page.waitForTimeout(450);
  }

  await openPalette();
  await page.screenshot({ path: path.join(SHOTS, `${theme}-empty.png`) });
  assert.equal(
    await shadow(() => document.querySelector('hop-palette').shadowRoot.activeElement?.tagName),
    'INPUT',
    'the search input is focused on open',
  );
  const panelWidth = await shadow(
    () => document.querySelector('hop-palette').shadowRoot.querySelector('.hop-panel').getBoundingClientRect().width,
  );
  assert.equal(panelWidth, 640, 'sizes ignore the page root font-size');

  await page.keyboard.type('doc');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, `${theme}-query.png`) });
  const firstResult = await shadow(
    () => document.querySelector('hop-palette').shadowRoot.querySelector('[cmdk-item][data-selected="true"]')?.textContent,
  );
  assert.match(firstResult, /Documentation API/, 'best match is selected');

  await page.keyboard.press('Control+a');
  await page.keyboard.type('>rel');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, `${theme}-commands.png`) });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  assert.notEqual(
    await shadow(() => document.elementFromPoint(550, 300)?.tagName),
    'HOP-PALETTE',
    'the page is clickable once the palette is closed',
  );

  await openPalette();
  await page.keyboard.type('recep');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const active = await worker.evaluate(async () => (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0].title);
  assert.equal(active, 'Boîte de réception', 'Enter switches to the picked tab');
  const usage = await worker.evaluate(async () => (await chrome.storage.local.get('usage')).usage);
  assert.ok(usage.queries.rec, 'the pick is learned');

  const standalone = await context.newPage();
  await standalone.setViewportSize({ width: 680, height: 500 });
  await standalone.goto(`chrome-extension://${extensionId}/palette.html?mode=window`);
  await standalone.waitForTimeout(500);
  await standalone.keyboard.type('gu');
  await standalone.waitForTimeout(300);
  await standalone.screenshot({ path: path.join(SHOTS, `${theme}-standalone.png`) });

  const options = await context.newPage();
  await options.setViewportSize({ width: 900, height: 1300 });
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.waitForTimeout(500);
  await options.screenshot({ path: path.join(SHOTS, `${theme}-options.png`), fullPage: true });

  // Hop's own pages cannot be injected: they host the overlay themselves.
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: chrome.runtime.getURL('/options.html') });
    await chrome.runtime.sendMessage({ hop: 'toggle', tabId: tab.id });
  });
  await options.waitForTimeout(450);
  await options.screenshot({ path: path.join(SHOTS, `${theme}-options-overlay.png`) });
  assert.equal(
    await options.evaluate(() => document.activeElement?.getAttribute('cmdk-input')),
    '',
    'the overlay opens in extension pages',
  );

  // New tab, off by default: hands over to Chrome's own page.
  const chromeNewTab = await context.newPage();
  await chromeNewTab.goto(`chrome-extension://${extensionId}/newtab.html`);
  await chromeNewTab.waitForURL(/^chrome:\/\/new-tab-page/, { timeout: 5_000 });
  await chromeNewTab.close();

  // Opted in: the palette is open and focused right away.
  await worker.evaluate(() => chrome.storage.sync.set({ settings: { newTabPalette: true } }));
  const newTab = await context.newPage();
  await newTab.goto(`chrome-extension://${extensionId}/newtab.html`);
  await newTab.waitForURL(/\?focus$/);
  await newTab.waitForTimeout(500);
  await newTab.screenshot({ path: path.join(SHOTS, `${theme}-newtab.png`) });
  assert.equal(
    await newTab.evaluate(() => document.activeElement?.getAttribute('cmdk-input')),
    '',
    'the new tab opens with the palette focused',
  );
  await newTab.keyboard.press('Escape');
  await newTab.waitForTimeout(400);
  await newTab.screenshot({ path: path.join(SHOTS, `${theme}-newtab-idle.png`) });

  assert.deepEqual(errors, [], 'no page errors');
  console.log(`✔ e2e smoke test passed (${theme}). Screenshots: ${path.relative(ROOT, SHOTS)}`);
} finally {
  await context.close();
  server.close();
  rmSync(temp, { recursive: true, force: true });
}
