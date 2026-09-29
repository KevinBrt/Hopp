import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'wxt';

/**
 * Chrome refuses to inject scripts containing Unicode noncharacters
 * (U+FFFE, U+FFFF, U+FDD0–U+FDEF), which minifiers may inline from escaped
 * regexes. Fail the build instead of shipping a palette that never opens.
 */
async function assertInjectableScripts(outDir: string): Promise<void> {
  const NONCHARACTER = /[﷐-﷯￾￿]/;
  const files = await readdir(outDir, { recursive: true });
  for (const file of files.filter((name) => name.endsWith('.js'))) {
    const code = await readFile(path.join(outDir, file), 'utf8');
    const index = code.search(NONCHARACTER);
    if (index !== -1) {
      throw new Error(`${file} contains a Unicode noncharacter near: ${code.slice(index - 40, index + 10)}`);
    }
  }
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
  hooks: {
    'build:done': (wxt) => assertInjectableScripts(wxt.config.outDir),
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
