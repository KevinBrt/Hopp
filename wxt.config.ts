import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { InlineConfig } from 'vite';
import { defineConfig } from 'wxt';

/** U+FDD0–U+FDEF, U+FFFE and U+FFFF. */
const isNoncharacter = (code: number) => (code >= 0xfdd0 && code <= 0xfdef) || code === 0xfffe || code === 0xffff;

/**
 * Chrome refuses to inject scripts containing Unicode noncharacters
 * (U+FFFE, U+FFFF, U+FDD0–U+FDEF), which minifiers may inline from escaped
 * regexes. Fail the build instead of shipping a palette that never opens.
 */
async function assertInjectableScripts(outDir: string): Promise<void> {
  const files = await readdir(outDir, { recursive: true });
  for (const file of files.filter((name) => name.endsWith('.js'))) {
    const code = await readFile(path.join(outDir, file), 'utf8');
    for (let index = 0; index < code.length; index++) {
      if (isNoncharacter(code.charCodeAt(index))) {
        throw new Error(`${file} contains a Unicode noncharacter near: ${code.slice(index - 40, index)}`);
      }
    }
  }
}

/**
 * The overlay script is injected into web pages, so its size is felt on
 * every first opening: it renders with Preact (~10 KB) instead of React
 * (~190 KB) through preact/compat. Extension pages keep React.
 */
const PREACT_ALIASES = [
  { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
  { find: /^react-dom$/, replacement: 'preact/compat' },
  { find: /^react\/jsx-(dev-)?runtime$/, replacement: 'preact/jsx-runtime' },
  { find: /^react$/, replacement: 'preact/compat' },
];

function usePreact(config: InlineConfig): void {
  const current = config.resolve?.alias ?? [];
  const aliases = Array.isArray(current)
    ? current
    : Object.entries(current).map(([find, replacement]) => ({ find, replacement }));
  config.resolve = { ...config.resolve, alias: [...PREACT_ALIASES, ...aliases] };
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
  hooks: {
    'build:done': (wxt) => assertInjectableScripts(wxt.config.outDir),
    'vite:build:extendConfig': (entrypoints, config) => {
      if (entrypoints.some((entrypoint) => entrypoint.name === 'overlay')) usePreact(config);
    },
  },
  manifest: ({ browser }) => {
    const isFirefox = browser === 'firefox';

    return {
      name: '__MSG_extName__',
      description: '__MSG_extDescription__',
      default_locale: 'en',
      permissions: [
        'activeTab',
        'bookmarks',
        'history',
        'scripting',
        'search',
        'sessions',
        'storage',
        'tabs',
        'topSites',
        ...(isFirefox ? [] : ['favicon', 'tabGroups']),
      ],
      // Lets the in-page palette display Chrome's cached favicons.
      web_accessible_resources: isFirefox
        ? undefined
        : [{ resources: ['_favicon/*'], matches: ['<all_urls>'] }],
      action: { default_title: '__MSG_extName__' },
      commands: {
        'open-palette': {
          suggested_key: { default: 'Alt+K', mac: 'Alt+K' },
          description: '__MSG_commandOpenPalette__',
        },
      },
      browser_specific_settings: isFirefox
        ? { gecko: { id: 'hop@command-palette', strict_min_version: '115.0' } }
        : undefined,
    };
  },
});
