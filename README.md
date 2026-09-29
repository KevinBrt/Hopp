# Hop

A fast, smart command palette for Chrome and Firefox: switch to an open tab,
reopen a page you visit often, search history, bookmarks and the web, or run a
browser command. It pops up in the middle of the page, Arc-style. Optionally
(settings, off by default), new tabs open straight in the palette.

Built with [WXT](https://wxt.dev), React, [cmdk](https://cmdk.paco.me) (shadcn/ui
styling), Tailwind CSS v4 and [uFuzzy](https://github.com/leeoniya/uFuzzy).

## Usage

- **Alt+K** opens the palette (change it in Hop's settings, or on
  `chrome://extensions/shortcuts` in Chrome). Clicking the toolbar icon works too.
- **↑↓** navigate, **Enter** open, **Ctrl/⌘+Enter** open in the other place
  (current tab ↔ new tab), **Shift+Enter** open in a new window.
- **Shift+Delete** closes the selected tab, or removes the page from history.
- Start with a prefix to filter: `>` commands, `@` tabs, `*` bookmarks, `#` history.
  Backspace on an empty input removes the filter.

## Development

```sh
npm install
npm run dev            # Chrome with hot reload
npm run dev:firefox
npm run build          # .output/chrome-mv3
npm run build:firefox  # .output/firefox-mv2
npm run zip            # store-ready archives

npm run typecheck
npm test               # unit tests (ranking, learning, URL handling)
npm run test:e2e       # browser smoke test (after `npm run build`, and once `npx playwright install chromium`)
```

## How it works

```
src/
  core/          Pure logic, no browser API, unit tested
    items.ts       Data model: PaletteItem union (tab | page | command | navigate | search)
    corpus.ts      Merges tabs, history, bookmarks and top sites by canonical URL
    matcher.ts     uFuzzy candidates + launcher-style match quality
    ranker.ts      Scoring, sections, empty-query suggestions, scopes
    usage.ts       Adaptive learning (picks per typed prefix, habits by time of day)
    signals.ts     Frecency and tab recency
    scopes.ts      `>`, `@`, `*`, `#` filters
  background/    Service worker
    sources/       One file per data source (tabs, history, bookmarks, top sites)
    commands/      Command registry
    corpus.ts      Builds the corpus sent to the palette
    executor.ts    Opens / switches / searches / runs what was picked
    launcher.ts    Shows the palette: in-page overlay, else popup, else window
  shared/        Code used on both sides: settings, typed messaging, search engines
  ui/            React: palette, options page, shadcn-style components
  entrypoints/   WXT entry points (background, overlay content script, pages)
  locales/       en.yml, fr.yml
```

**Opening.** The shortcut goes to the background, which asks the current page's
overlay to toggle. The first time in a tab, the overlay script is injected on
demand (`activeTab` + `scripting`), so pages that never use Hop pay nothing.
Hop's own pages (new tab, options) host the overlay themselves. Other browser
pages (`chrome://…`) and web stores refuse injection: the palette then opens as
the toolbar popup, or as a small centered window.

**New tab.** A manifest override cannot be toggled, so Hop always owns the
new tab page and reads the `newTabPalette` setting: off, it hands over to
`chrome://new-tab-page` (Firefox forbids opening its own page, so a calm Hop
page stays); on, it opens the palette. Browsers focus the address bar on new
tab pages, so the page reloads itself once (`?focus`) to get the keyboard. Picking a result there
navigates the same tab instead of opening another one.

**Speed.** When the shortcut is pressed the background starts building the
corpus right away; the palette reuses that in-flight request, then ranks
locally on every keystroke (no messaging round trip while typing). Typing uses
`useDeferredValue`, the list height is animated by CSS, and rows are memoized.
The whole history is also searched in the background (debounced) for pages
older than the 120 days kept in the corpus.

**Ranking.** Each result gets
`100 × match quality + 45 × learned + 28 × frecency + 12 × habit + small biases`:

- *match quality* (0–1) rewards what launcher users mean: a domain prefix
  (`gith` → github.com), a title prefix, word starts; typos and out-of-order
  words still match, accents are ignored;
- *learned*: what you picked before for this prefix (typing `gi` after
  picking GitHub for `git` puts GitHub first);
- *frecency*: visits × recency, typed URLs, bookmarks, top sites;
- *habit*: how often and recently you picked it, more around this time of day;
- open tabs get a bonus (switching beats a duplicate); the current tab is
  demoted.

With an empty query Hop suggests recently used tabs, then pages you use
around this time, then recent history. Learning data stays in
`storage.local` and can be erased from the settings.

## Extending

- **A command**: add a `defineCommand` (or `defineTabCommand`) entry to a list
  in `src/background/commands/`, with its title in `src/locales/*.yml`. If it
  needs a new icon, add the name to `ICON_NAMES` (`core/items.ts`) and map it in
  `ui/palette/item-icon.tsx`. A command can return `{ copy }` to have the UI
  write to the clipboard.
- **A data source**: add a loader in `src/background/sources/` returning
  `RawPage[]` (or new items), wire it in `background/corpus.ts` and add a
  toggle in `shared/settings.ts` (`sources`).
- **A scope**: add an entry to `SCOPES` in `core/scopes.ts` plus its labels.
- **A setting**: add it to `Settings` and `DEFAULT_SETTINGS`; missing keys are
  filled with defaults, so no migration is needed.
- **A language**: add `src/locales/<lang>.yml` with the same keys as `en.yml`.
- **A background method**: declare it in `BackgroundApi`
  (`shared/messaging.ts`), implement it in `background/index.ts`, call it
  with `callBackground('method', input)`.

## Gotchas

- The overlay lives in a shadow root on arbitrary websites. `rem` values are
  converted to `px` at build time (`postcss.config.mjs`) because `rem` follows
  the host page's root font-size.
- WXT resets the shadow host with `all: initial !important`, which overrides
  inline styles on the host element: style the inner container instead.
- Chrome refuses to inject scripts containing Unicode noncharacters (e.g. a
  `￿` regex range inlined by the minifier). The build fails if one sneaks in.
